// 递话 Share Extension
// 出现在 macOS 系统共享菜单里（微信「转发到其他应用 → 选择电脑中的应用」就是这个列表）。
// 职责只有一件事：把分享进来的文件复制到自己的沙盒临时目录，然后用 dihua://import?path=… 交给主程序。
// 同一份代码打成多个 appex：通用的「递话」（弹确认窗），以及每个目标应用一个的「递给 ChatGPT」等——
// 后者的 Info.plist 里带 DihuaTarget，这里把它作为 target 参数附在 URL 上，主程序收到后直接递给该目标。
#import <Cocoa/Cocoa.h>

static NSString *const kImportURL = @"dihua://import";

/** Info.plist 里的 DihuaTarget（通用入口没有这个键） */
static NSString *DihuaTargetId(void) {
  id v = [NSBundle.mainBundle objectForInfoDictionaryKey:@"DihuaTarget"];
  return [v isKindOfClass:[NSString class]] && [v length] ? v : nil;
}

@interface DihuaShareViewController : NSViewController
@end

@implementation DihuaShareViewController {
  NSTextField *_label;
  NSProgressIndicator *_spinner;
  BOOL _started;
}

- (void)loadView {
  NSView *view = [[NSView alloc] initWithFrame:NSMakeRect(0, 0, 360, 110)];
  _spinner = [[NSProgressIndicator alloc] initWithFrame:NSMakeRect(164, 58, 32, 32)];
  _spinner.style = NSProgressIndicatorStyleSpinning;
  _spinner.autoresizingMask = NSViewMinXMargin | NSViewMaxXMargin;
  [_spinner startAnimation:nil];
  [view addSubview:_spinner];

  NSString *display = [NSBundle.mainBundle objectForInfoDictionaryKey:@"CFBundleDisplayName"];
  NSString *text = DihuaTargetId() && display.length ? [NSString stringWithFormat:@"正在%@…", display] : @"正在递给「递话」…";
  _label = [NSTextField labelWithString:text];
  _label.alignment = NSTextAlignmentCenter;
  _label.frame = NSMakeRect(16, 24, 328, 20);
  _label.autoresizingMask = NSViewWidthSizable;
  [view addSubview:_label];
  self.view = view;
}

- (void)viewDidLoad {
  [super viewDidLoad];
  dispatch_async(dispatch_get_main_queue(), ^{ [self startIfNeeded]; });
}

- (void)viewDidAppear {
  [super viewDidAppear];
  [self startIfNeeded];
}

- (void)startIfNeeded {
  if (_started || self.extensionContext == nil) return;
  _started = YES;
  [self collectFiles];
}

#pragma mark - 收集分享进来的文件

- (void)collectFiles {
  NSExtensionContext *ctx = self.extensionContext;
  NSString *tmpDir = NSTemporaryDirectory();
  NSMutableArray<NSString *> *paths = [NSMutableArray array];
  dispatch_group_t group = dispatch_group_create();

  for (NSExtensionItem *item in ctx.inputItems) {
    for (NSItemProvider *provider in item.attachments) {
      if ([provider hasItemConformingToTypeIdentifier:@"public.file-url"]) {
        dispatch_group_enter(group);
        [provider loadItemForTypeIdentifier:@"public.file-url"
                                    options:nil
                          completionHandler:^(id<NSSecureCoding> data, NSError *error) {
                            NSURL *url = [self urlFromLoadedItem:data];
                            if (url) {
                              NSString *copied = [self copyFileAtURL:url intoDirectory:tmpDir];
                              if (copied) {
                                @synchronized(paths) { [paths addObject:copied]; }
                              }
                            } else {
                              NSLog(@"[DihuaShare] file-url item unreadable: %@", error);
                            }
                            dispatch_group_leave(group);
                          }];
      } else if ([provider hasItemConformingToTypeIdentifier:@"public.data"]) {
        // 有些来源直接给数据而不是文件 URL
        NSString *name = provider.suggestedName.length ? provider.suggestedName : @"聊天记录.zip";
        dispatch_group_enter(group);
        [provider loadDataRepresentationForTypeIdentifier:@"public.data"
                                        completionHandler:^(NSData *data, NSError *error) {
                                          if (data.length) {
                                            NSString *dest = [tmpDir stringByAppendingPathComponent:
                                                              [NSString stringWithFormat:@"%@-%@", NSUUID.UUID.UUIDString, name]];
                                            if ([data writeToFile:dest atomically:YES]) {
                                              @synchronized(paths) { [paths addObject:dest]; }
                                            }
                                          } else {
                                            NSLog(@"[DihuaShare] data item unreadable: %@", error);
                                          }
                                          dispatch_group_leave(group);
                                        }];
      }
    }
  }

  dispatch_group_notify(group, dispatch_get_main_queue(), ^{ [self handoff:paths]; });
}

- (NSURL *)urlFromLoadedItem:(id)data {
  if ([data isKindOfClass:[NSURL class]]) return (NSURL *)data;
  if ([data isKindOfClass:[NSData class]]) return [NSURL URLWithDataRepresentation:(NSData *)data relativeToURL:nil];
  if ([data isKindOfClass:[NSString class]]) {
    NSString *s = (NSString *)data;
    return [s hasPrefix:@"/"] ? [NSURL fileURLWithPath:s] : [NSURL URLWithString:s];
  }
  return nil;
}

- (NSString *)copyFileAtURL:(NSURL *)url intoDirectory:(NSString *)dir {
  BOOL scoped = [url startAccessingSecurityScopedResource];
  NSString *name = url.lastPathComponent.length ? url.lastPathComponent : @"file";
  NSString *dest = [dir stringByAppendingPathComponent:[NSString stringWithFormat:@"%@-%@", NSUUID.UUID.UUIDString, name]];
  NSError *error = nil;
  BOOL ok = [[NSFileManager defaultManager] copyItemAtURL:url toURL:[NSURL fileURLWithPath:dest] error:&error];
  if (scoped) [url stopAccessingSecurityScopedResource];
  if (!ok) {
    NSLog(@"[DihuaShare] copy %@ failed: %@", url, error);
    return nil;
  }
  return dest;
}

#pragma mark - 交给主程序

- (void)handoff:(NSArray<NSString *> *)paths {
  if (paths.count == 0) {
    [_spinner stopAnimation:nil];
    _label.stringValue = @"没有收到可处理的文件";
    NSError *error = [NSError errorWithDomain:@"app.dihua.share" code:1
                                     userInfo:@{NSLocalizedDescriptionKey : @"没有收到可处理的文件"}];
    dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.2 * NSEC_PER_SEC)), dispatch_get_main_queue(), ^{
      [self.extensionContext cancelRequestWithError:error];
    });
    return;
  }

  NSURLComponents *components = [NSURLComponents componentsWithString:kImportURL];
  NSMutableArray<NSURLQueryItem *> *query = [NSMutableArray array];
  for (NSString *p in paths) [query addObject:[NSURLQueryItem queryItemWithName:@"path" value:p]];
  [query addObject:[NSURLQueryItem queryItemWithName:@"source" value:@"share"]];
  NSString *target = DihuaTargetId();
  if (target) [query addObject:[NSURLQueryItem queryItemWithName:@"target" value:target]];
  components.queryItems = query;

  NSWorkspaceOpenConfiguration *config = [NSWorkspaceOpenConfiguration configuration];
  config.activates = YES;
  [[NSWorkspace sharedWorkspace] openURL:components.URL
                           configuration:config
                       completionHandler:^(NSRunningApplication *app, NSError *error) {
                         dispatch_async(dispatch_get_main_queue(), ^{
                           if (error) {
                             NSLog(@"[DihuaShare] open main app failed: %@", error);
                             [self.extensionContext cancelRequestWithError:error];
                           } else {
                             [self.extensionContext completeRequestReturningItems:@[] completionHandler:nil];
                           }
                         });
                       }];
}

@end

import * as Application from "expo-application";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Stack, useRouter } from "expo-router";
import { useCSSVariable } from "uniwind";

const GLASS = isLiquidGlassAvailable();

export default function SettingsLayout() {
  const router = useRouter();

  const appForeground = useCSSVariable("--app-foreground") as string;
  const appBackground = useCSSVariable("--app-background") as string;

  return (
    <Stack
      screenOptions={{
        headerTransparent: GLASS,
        headerLargeTitleShadowVisible: false,
        headerBackButtonDisplayMode: GLASS ? "minimal" : "default",
        headerTintColor: appForeground,
        headerShadowVisible: false,
        headerStyle: {
          backgroundColor: appBackground,
        },
      }}
    >
      <Stack.Screen
        name="settings"
        options={{
          title: "设置",
          headerLeft: () => null,
        }}
      >
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button icon="xmark" onPress={() => router.back()} />
        </Stack.Toolbar>
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Menu icon="info.circle">
            <Stack.Toolbar.MenuAction icon={"app"}>
              {`${Application.applicationName} v${Application.nativeApplicationVersion} (${Application.nativeBuildVersion})`}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline>
              <Stack.Toolbar.MenuAction icon="doc.text">
                使用政策
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction icon="arrow.up.forward.square">
                服务条款
              </Stack.Toolbar.MenuAction>
              <Stack.Toolbar.MenuAction icon="arrow.up.forward.square">
                隐私政策
              </Stack.Toolbar.MenuAction>
            </Stack.Toolbar.Menu>
            <Stack.Toolbar.MenuAction icon="arrow.up.forward.square">
              帮助与支持
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      </Stack.Screen>
      <Stack.Screen
        name="profile"
        options={{
          title: "个人资料",
        }}
      />
      <Stack.Screen
        name="capabilities"
        options={{
          title: "功能",
        }}
      />
    </Stack>
  );
}

import { useModel } from "@/components/model-context";
import {
  Button,
  Host,
  HStack,
  Menu,
  Section,
  Image as SUIImage,
  Text as SUIText,
  Toggle,
  VStack,
} from "@expo/ui/swift-ui";
import {
  controlSize,
  font,
  foregroundStyle,
} from "@expo/ui/swift-ui/modifiers";
import { Stack } from "expo-router";
import { useColorScheme } from "react-native";
import { useDrawer } from "./drawer-content";

function HeaderTitleMenu() {
  const { models, selectedModel, extendedThinking, setExtendedThinking } =
    useModel();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const headerFg = isDark ? "#fff" : "#000";
  const headerFgMuted = isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)";

  const selected = models.find((m) => m.id === selectedModel);
  const subtitle = extendedThinking ? "深度思考" : undefined;
  return (
    <Host
      style={{
        minWidth: 120,
        minHeight: 40,
      }}
    >
      <Menu
        label={
          <VStack spacing={0}>
            <HStack spacing={4} alignment="center">
              <SUIText
                modifiers={[
                  foregroundStyle(headerFg),
                  font({ weight: "semibold", size: 17 }),
                ]}
              >
                {selected?.label ?? "模型"}
              </SUIText>
              <SUIImage systemName="chevron.down" size={10} color={headerFg} />
            </HStack>
            {subtitle && (
              <SUIText
                modifiers={[foregroundStyle(headerFgMuted), font({ size: 12 })]}
              >
                {subtitle}
              </SUIText>
            )}
          </VStack>
        }
        modifiers={[controlSize("regular")]}
      >
        <Section title="对话操作">
          <Button
            systemImage="archivebox"
            label="添加到项目"
            onPress={() => {}}
          />
          <Button systemImage="star" label="收藏" onPress={() => {}} />
          <Button systemImage="pencil" label="重命名" onPress={() => {}} />
          <Button
            systemImage="trash"
            label="删除"
            role="destructive"
            onPress={() => {}}
          />
        </Section>
        <Toggle isOn={extendedThinking} onIsOnChange={setExtendedThinking}>
          <SUIText>深度思考</SUIText>
          <SUIText>复杂任务思考更久</SUIText>
        </Toggle>
      </Menu>
    </Host>
  );
}

export function MainHeader() {
  const { openDrawer } = useDrawer();
  return (
    <>
      <Stack.Screen.Title asChild>
        <HeaderTitleMenu />
      </Stack.Screen.Title>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button icon="list.bullet" onPress={openDrawer} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="eyeglasses" />
      </Stack.Toolbar>
    </>
  );
}

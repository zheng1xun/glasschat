import * as WebBrowser from "expo-web-browser";
import React from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { useCSSVariable } from "uniwind";
import Markdown from "./markdown";

const VAR_NAMES = [
  "--app-foreground",
  "--app-muted-foreground",
  "--app-border",
  "--app-secondary",
  "--app-muted",
  "--app-accent",
  // 品牌强调色（DeepSeek 蓝）
  "--app-brand",
] as const;

/**
 * Convert single newlines to hard breaks (two trailing spaces) so they render
 * the same way they appear during streaming. Skips fenced code blocks.
 */
function preserveNewlines(md: string): string {
  return md.replace(/(```[\s\S]*?```)|(\n)/g, (match, codeBlock) =>
    codeBlock ? match : "  \n",
  );
}

export function ChatMarkdown({ children }: { children: string }) {
  const [text, text2, border, bg2, bg3, fill3, link] = useCSSVariable(
    VAR_NAMES as unknown as string[],
  ) as string[];

  const isWeb = process.env.EXPO_OS === "web";
  const baseFontSize = isWeb ? 13 : 16;
  // DeepSeek 式阅读体验：行高 1.6~1.7 倍
  const baseLineHeight = isWeb ? 21.5 : 26;

  // Only overrides — defaults from utils.ts are merged automatically
  const markdownStyles = {
    heading1: { fontSize: 24, color: text, marginTop: 16, marginBottom: 8 },
    heading2: { fontSize: 20, lineHeight: 28, fontWeight: "bold" as const, color: text, marginTop: 14, marginBottom: 6 },
    heading3: { fontSize: 18, color: text, marginTop: 12, marginBottom: 4 },
    heading4: { fontSize: 16, color: text, marginTop: 10, marginBottom: 4 },
    heading5: { fontSize: 14, color: text },
    heading6: { fontSize: 12, color: text },
    paragraph: { fontSize: baseFontSize, lineHeight: baseLineHeight, marginVertical: 6 },
    list: { marginVertical: 6 },
    listItem: { marginVertical: 3 },
    text: { color: text, fontSize: baseFontSize, lineHeight: baseLineHeight },
    thematicBreak: { backgroundColor: border },
    blockquote: { backgroundColor: bg3, borderColor: border, paddingHorizontal: 8 },
    codeContainer: { backgroundColor: fill3, padding: 12, borderRadius: 8 },
    codeText: {
      fontSize: isWeb ? 12 : 14,
      color: text,
      fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
    },
    inlineCode: {
      fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
      paddingHorizontal: 4,
      fontSize: isWeb ? 12 : 15,
      color: text,
      overflow: "hidden" as const,
      borderRadius: 4,
      backgroundColor: fill3,
    },
    link: { fontSize: baseFontSize, color: link },
    image: { height: 200, aspectRatio: 16 / 9, backgroundColor: fill3, borderRadius: 8 },
    listBullet: { color: text2, fontVariant: ["tabular-nums" as const], marginRight: 8 },
    table: { borderColor: border, borderRadius: 8 },
    tableRow: { borderBottomColor: border },
    tableHeaderRow: { backgroundColor: bg2 },
    tableCell: { padding: 10, borderRightColor: border },
    tableHeaderCell: { backgroundColor: bg2 },
    tableCellText: { color: text },
    tableHeaderCellText: { color: text },
  };

  return (
    <Markdown
      styles={markdownStyles}
      onLinkPress={(url) => {
        if (process.env.EXPO_OS === "web") {
          Linking.openURL(url);
        } else {
          WebBrowser.openBrowserAsync(url, {
            presentationStyle: WebBrowser.WebBrowserPresentationStyle.AUTOMATIC,
          });
        }
      }}
      renderRules={{
        // 段落可选中（长按复制），列表项内不加额外间距
        paragraph: ({ node, styles, children, parentStack }) => {
          const inListItem = parentStack.some((p) => p.type === "listItem");
          return (
            <Text
              key={node.key}
              selectable
              style={[
                styles.paragraph as any,
                inListItem && { marginVertical: 0 },
              ]}
            >
              {children}
            </Text>
          );
        },
        // 引用角标：正文里的 [1]、[2] 渲染为蓝色小角标（DeepSeek 风格）
        text: ({ node, styles }) => {
          const value: string = node.value ?? "";
          if (!/\[\d{1,2}\]/.test(value)) {
            return (
              <Text
                key={node.key}
                style={styles.text as any}
                maxFontSizeMultiplier={1.2}
              >
                {value}
              </Text>
            );
          }
          const parts = value.split(/(\[\d{1,2}\])/g);
          return (
            <Text
              key={node.key}
              style={styles.text as any}
              maxFontSizeMultiplier={1.2}
            >
              {parts.map((part, i) =>
                /^\[\d{1,2}\]$/.test(part) ? (
                  <Text
                    key={i}
                    style={{
                      fontSize: 10,
                      color: "#4B7BFF",
                      transform: [{ translateY: -5 }],
                    }}
                  >
                    {part}
                  </Text>
                ) : (
                  part
                ),
              )}
            </Text>
          );
        },
        listItem: ({ node, styles, children, extras }) => (
          <View key={node.key} style={styles.listItem as any}>
            {extras?.customListStyleType ? (
              extras.customListStyleType
            ) : (
              <Text
                style={[
                  styles.listBullet as any,
                  extras?.ordered
                    ? fullStyles.orderedBullet
                    : fullStyles.unorderedBullet,
                ]}
              >
                {extras?.listStyleType}
              </Text>
            )}
            <View style={styles.listItemContent as any}>{children}</View>
          </View>
        ),
      }}
      markdown={preserveNewlines(children)}
    />
  );
}

const fullStyles = StyleSheet.create({
  orderedBullet: {
    fontFamily: Platform.select({ ios: "ui-monospace", default: "monospace" }),
    fontWeight: "normal",
  },
  unorderedBullet: {
    fontSize: 18,
    fontWeight: "900",
  },
});

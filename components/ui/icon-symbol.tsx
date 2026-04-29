import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "gearshape.fill": "settings",
  "person.fill": "person",
  "speaker.wave.2.fill": "volume-up",
  "xmark": "close",
  "xmark.circle.fill": "cancel",
  "checkmark": "check",
  "trash.fill": "delete",
  "arrow.left": "arrow-back",
  "mic.fill": "mic",
  "lock.fill": "lock",
  "lock.open.fill": "lock-open",
  "info.circle.fill": "info",
  "star.fill": "star",
  "heart.fill": "favorite",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}

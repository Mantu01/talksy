import React from "react";
import { Avatar } from "react-native-paper";
import { getImageUrl } from "../../utils/api";
import { StyleProp, ViewStyle } from "react-native";

interface SafeAvatarProps {
  uri?: string;
  name: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export const SafeAvatar: React.FC<SafeAvatarProps> = ({
  uri,
  name,
  size = 48,
  style,
}) => {
  const imageUrl = getImageUrl(uri);
  const initial = name ? name.charAt(0).toUpperCase() : "";

  if (imageUrl) {
    return <Avatar.Image size={size} source={{ uri: imageUrl }} style={style} />;
  }
  return <Avatar.Text size={20} label={initial} style={style} />;
};

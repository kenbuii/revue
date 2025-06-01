import React, { ReactNode } from 'react';
import { Keyboard, Pressable, StyleSheet } from 'react-native';

interface KeyboardDismissWrapperProps {
  children: ReactNode;
  style?: object;
}

export default function KeyboardDismissWrapper({ children, style }: KeyboardDismissWrapperProps) {
  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <Pressable style={[styles.container, style]} onPress={dismissKeyboard}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 
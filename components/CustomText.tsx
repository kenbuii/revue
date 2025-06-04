import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';

interface CustomTextProps extends TextProps {
  weight?: 'regular' | 'bold';
  italic?: boolean;
}

export default function CustomText({ 
  weight = 'regular', 
  italic = false, 
  style, 
  ...props 
}: CustomTextProps) {
  const getFontFamily = () => {
    if (italic && weight === 'bold') {
      // No bold italic variant available, use regular italic
      return 'LibreBaskerville_400Regular_Italic';
    } else if (italic) {
      return 'LibreBaskerville_400Regular_Italic';
    } else if (weight === 'bold') {
      return 'LibreBaskerville_700Bold';
    } else {
      return 'LibreBaskerville_400Regular';
    }
  };

  return (
    <Text 
      style={[
        { fontFamily: getFontFamily() },
        style
      ]}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  // Helper styles for common text patterns
  heading: {
    fontFamily: 'LibreBaskerville_700Bold',
    fontSize: 18,
  },
  subheading: {
    fontFamily: 'LibreBaskerville_400Regular',
    fontSize: 16,
  },
  body: {
    fontFamily: 'LibreBaskerville_400Regular',
    fontSize: 14,
  },
  caption: {
    fontFamily: 'LibreBaskerville_400Regular_Italic',
    fontSize: 12,
  },
});

export { styles as textStyles }; 
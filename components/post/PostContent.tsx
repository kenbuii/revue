import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PostContentProps {
  title?: string;
  contentType: 'image' | 'text' | 'mixed';
  content: string;
  textContent?: string;
  expandable?: boolean;
  maxLines?: number;
}

export default function PostContent({ 
  title,
  contentType, 
  content, 
  textContent,
  expandable = true,
  maxLines = 4 
}: PostContentProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [numberOfLines, setNumberOfLines] = useState<number | undefined>(maxLines);
  const [showReadMore, setShowReadMore] = useState(false);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setNumberOfLines(isExpanded ? maxLines : undefined);
  };

  const handleTextLayout = ({ nativeEvent: { lines } }: any) => {
    if (lines.length > maxLines && !isExpanded && expandable) {
      setShowReadMore(true);
      setNumberOfLines(maxLines);
    } else if (lines.length <= maxLines) {
      setShowReadMore(false);
    }
  };

  const renderTextContent = (text: string) => (
    <View>
      <Text 
        style={styles.contentText} 
        numberOfLines={numberOfLines}
        onTextLayout={handleTextLayout}
      >
        {text}
      </Text>
      {showReadMore && expandable && (
        <TouchableOpacity onPress={toggleExpand} style={styles.readMoreButton}>
          <Text style={styles.readMoreText}>
            {isExpanded ? 'Show less' : 'Read more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderImageContent = (imageUri: string) => (
    <View style={styles.imageContainer}>
      <Image 
        source={{ uri: imageUri }} 
        style={styles.contentImage} 
        resizeMode="contain"
      />
    </View>
  );

  const renderContent = () => {
    switch (contentType) {
      case 'image':
        return renderImageContent(content);
        
      case 'text':
        return renderTextContent(content);
        
      case 'mixed':
        return (
          <View>
            {textContent && renderTextContent(textContent)}
            {renderImageContent(content)}
          </View>
        );
        
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.postTitle}>{title}</Text>}
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  postTitle: {
    fontSize: 17,
    fontWeight: '500',
    marginBottom: 8,
    color: '#000',
  },
  contentText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    color: '#000',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 10,
  },
  contentImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
  },
  readMoreButton: {
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  readMoreText: {
    color: '#004D00',
    fontSize: 14,
    fontFamily: 'LibreBaskerville_400Regular',
    fontWeight: '500',
  },
}); 
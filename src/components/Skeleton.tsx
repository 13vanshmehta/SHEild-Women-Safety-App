import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';

interface SkeletonProps {
  width?: ViewStyle['width'];
  height?: ViewStyle['height'];
  borderRadius?: number;
  style?: ViewStyle;
  children?: React.ReactNode;
}

const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
  children,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [animatedValue]);

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.border + '80'],
  });

  if (children) {
    return (
      <View style={[styles.container, style]}>
        <Animated.View
          style={[
            styles.skeleton,
            {
              width,
              height,
              borderRadius,
              backgroundColor,
            },
          ]}
        />
        <View style={styles.childrenContainer}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
};

// Predefined skeleton components for common use cases
export const SkeletonText: React.FC<{ lines?: number; width?: ViewStyle['width'] }> = ({
  lines = 1,
  width = '100%',
}) => (
  <View style={styles.textContainer}>
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton
        key={index}
        width={(index === lines - 1 ? '80%' : width) as any}
        height={16}
        style={[styles.textLine, { marginBottom: index < lines - 1 ? 8 : 0 }] as any}
      />
    ))}
  </View>
);

export const SkeletonCard: React.FC<{ height?: number }> = ({ height = 120 }) => (
  <View style={[styles.card, { height }]}>
    <Skeleton width={50} height={50} borderRadius={25} style={styles.cardImage} />
    <View style={styles.cardContent}>
      <SkeletonText lines={2} width="90%" />
      <Skeleton width="60%" height={12} style={styles.cardMeta} />
    </View>
  </View>
);

export const SkeletonList: React.FC<{ items?: number }> = ({ items = 3 }) => (
  <View style={styles.listContainer}>
    {Array.from({ length: items }).map((_, index) => (
      <SkeletonCard key={index} />
    ))}
  </View>
);

export const SkeletonProfile: React.FC = () => (
  <View style={styles.profileContainer}>
    <Skeleton width={80} height={80} borderRadius={40} style={styles.profileImage} />
    <View style={styles.profileInfo}>
      <Skeleton width="70%" height={20} style={styles.profileName} />
      <Skeleton width="50%" height={16} style={styles.profileMeta} />
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  childrenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    backgroundColor: Colors.border,
  },
  textContainer: {
    flex: 1,
  },
  textLine: {
    marginBottom: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 10,
  },
  cardImage: {
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
  },
  cardMeta: {
    marginTop: 8,
  },
  listContainer: {
    gap: 10,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  profileImage: {
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    marginBottom: 8,
  },
  profileMeta: {
    marginTop: 4,
  },
});

export default Skeleton;

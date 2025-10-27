import React, { useRef, useEffect } from 'react';
import { ScrollView, ScrollViewProps, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SlideViewProps extends Omit<ScrollViewProps, 'horizontal' | 'pagingEnabled'> {
  children: React.ReactElement[];
  currentIndex: number;
  onIndexChange?: (index: number) => void;
}

const SlideView: React.FC<SlideViewProps> = ({ children, currentIndex, onIndexChange, ...props }) => {
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ x: currentIndex * SCREEN_WIDTH, animated: true });
    }
  }, [currentIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    if (onIndexChange && index !== currentIndex) {
      onIndexChange(index);
    }
  };

  const childrenWithWidth = React.Children.map(children, (child, index) => {
    return React.cloneElement(child, {
      style: [child.props.style, { width: SCREEN_WIDTH }],
      key: `slide-${index}`,
    });
  });

  return (
    <ScrollView
      ref={scrollViewRef}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      onMomentumScrollEnd={handleScroll}
      {...props}
    >
      {childrenWithWidth}
    </ScrollView>
  );
};

export default SlideView;


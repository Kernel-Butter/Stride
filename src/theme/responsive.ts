import { useWindowDimensions } from 'react-native';

export interface Responsive {
  width: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  horizontalPadding: number;
  contentMaxWidth: number;
}

export function useResponsive(): Responsive {
  const { width } = useWindowDimensions();

  const horizontalPadding = width < 380 ? 16 : width < 768 ? 20 : width < 1024 ? 40 : 56;
  const contentMaxWidth = width < 768 ? width : 680;

  return {
    width,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
    horizontalPadding,
    contentMaxWidth,
  };
}

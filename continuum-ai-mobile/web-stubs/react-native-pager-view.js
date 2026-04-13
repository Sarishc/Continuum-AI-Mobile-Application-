import React, {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react';
import { View } from 'react-native';

/**
 * Minimal web stub: shows one child page at a time; supports setPage via ref.
 */
const PagerView = forwardRef(function PagerView(
  { children, style, initialPage = 0, onPageSelected },
  ref
) {
  const [page, setPage] = useState(initialPage);
  const pages = React.Children.toArray(children);

  const goTo = useCallback(
    (index) => {
      setPage(index);
      onPageSelected?.({ nativeEvent: { position: index } });
    },
    [onPageSelected]
  );

  useImperativeHandle(
    ref,
    () => ({
      setPage: goTo,
    }),
    [goTo]
  );

  return (
    <View style={[{ flex: 1, overflow: 'hidden' }, style]}>
      {pages.map((child, i) =>
        i === page ? (
          <View key={i} style={{ flex: 1 }}>
            {child}
          </View>
        ) : null
      )}
    </View>
  );
});

export default PagerView;

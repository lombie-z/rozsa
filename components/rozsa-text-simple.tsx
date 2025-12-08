'use client';

import { Suspense } from 'react';
import { useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

export const RozsaTextSimple: React.FC = () => {
  const { size } = useThree();
  const isSmall = size.width < 768;

  return (
    <Suspense fallback={null}>
      <Text
        position={[0, 0.5, 0]}
        fontSize={isSmall ? 4 : 6}
        anchorX="center"
        anchorY="middle"
        letterSpacing={0.1}
        fontWeight="bold"
        color="white"
      >
        ROZSA
        <meshBasicMaterial color="white" transparent opacity={0.9} />
      </Text>
    </Suspense>
  );
};

export default RozsaTextSimple;


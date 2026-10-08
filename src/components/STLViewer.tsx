import { Canvas, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { Suspense } from 'react';
import { OrbitControls, Stage } from '@react-three/drei';

function Model({ url }: { url: string }) {
  const geom = useLoader(STLLoader, url);
  
  return (
    // Standard rotation to convert Z-up (STL) to Y-up (Three.js)
    <mesh geometry={geom} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <meshPhysicalMaterial
        color="#cfc9e8"
        roughness={0.55}
        metalness={0.05}
        clearcoat={0.2}
        clearcoatRoughness={0.3}
      />
    </mesh>
  );
}

export default function STLViewer({ url }: { url: string }) {
  return (
    <div className="w-full h-full cursor-grab active:cursor-grabbing">
      <Canvas shadows camera={{ fov: 40 }}>
        <Suspense fallback={null}>
          {/* Stage automatically centers the model, grounds it, and adjusts the camera to fit perfectly within the div so it doesn't clip outside */}
          <Stage 
            environment="city" 
            intensity={0.6} 
            adjustCamera={1.2} 
            shadows={{ type: 'contact', opacity: 0.5, blur: 2 }}
          >
            <Model url={url} />
          </Stage>
        </Suspense>
        
        {/* OrbitControls handles all the drag-to-rotate interaction natively */}
        <OrbitControls 
          makeDefault 
          autoRotate={false} 
          enableZoom={false} // no wheel/pinch zoom: the figure keeps its size, and page scroll isn't hijacked 
          enablePan={false}
          minPolarAngle={Math.PI / 3} // limit how far they can look down from above
          maxPolarAngle={Math.PI / 2} // never below the floor
        />
      </Canvas>
    </div>
  );
}

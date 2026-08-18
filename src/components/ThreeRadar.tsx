import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { MarketItem } from '../types';

interface ThreeRadarProps {
  events: MarketItem[];
  onSelectEvent: (event: MarketItem) => void;
}

export const ThreeRadar: React.FC<ThreeRadarProps> = ({
  events,
  onSelectEvent,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredEvent, setHoveredEvent] = useState<MarketItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth || 640;
    const height = 380;

    // 1. Scene & Camera (大迫力の斜め見下ろしアングル)
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 1000);
    camera.position.set(0, 18, 22);
    camera.lookAt(0, 0, 0);

    // 2. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Radar Grids (Concentric Rings)
    const gridGroup = new THREE.Group();
    scene.add(gridGroup);

    const ringRadii = [4, 8, 12];
    ringRadii.forEach((r, idx) => {
      const ringGeo = new THREE.RingGeometry(r - 0.04, r, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx === 2 ? 0x38bdf8 : 0x1e3a8a,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: idx === 2 ? 0.6 : 0.3,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      gridGroup.add(ring);
    });

    // Crosshairs
    const lineMat = new THREE.LineBasicMaterial({ color: 0x1e3a8a, transparent: true, opacity: 0.4 });
    const pointsH = [new THREE.Vector3(-12, 0, 0), new THREE.Vector3(12, 0, 0)];
    const pointsV = [new THREE.Vector3(0, 0, -12), new THREE.Vector3(0, 0, 12)];
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsH), lineMat));
    gridGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pointsV), lineMat));

    // 4. Rotating Radar Sweep Beam
    const sweepGeo = new THREE.CircleGeometry(12, 32, 0, Math.PI / 3);
    const sweepMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
    });
    const sweep = new THREE.Mesh(sweepGeo, sweepMat);
    sweep.rotation.x = Math.PI / 2;
    scene.add(sweep);

    // 5. Event Nodes
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const nodesData: Array<{ mesh: THREE.Mesh; event: MarketItem }> = [];

    events.forEach((item, index) => {
      const angle = (index / events.length) * Math.PI * 2 + 0.3;
      const dist = 3 + (index * 1.4) % 8;

      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      const isBigMove = Math.abs(item.probChange24h) >= 8;
      const nodeColor = isBigMove ? 0xf43f5e : 0x38bdf8;

      const nodeGeo = new THREE.SphereGeometry(isBigMove ? 0.6 : 0.45, 16, 16);
      const nodeMat = new THREE.MeshBasicMaterial({ color: nodeColor });
      const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
      nodeMesh.position.set(x, 0.5, z);

      const glowGeo = new THREE.RingGeometry(0.7, 0.85, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: nodeColor,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.rotation.x = Math.PI / 2;
      nodeMesh.add(glow);

      nodeGroup.add(nodeMesh);
      nodesData.push({ mesh: nodeMesh, event: item });
    });

    // 6. Raycasting for Interaction
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesData.map(n => n.mesh));

      if (intersects.length > 0) {
        const found = nodesData.find(n => n.mesh === intersects[0].object);
        if (found) {
          setHoveredEvent(found.event);
          renderer.domElement.style.cursor = 'pointer';
        }
      } else {
        setHoveredEvent(null);
        renderer.domElement.style.cursor = 'default';
      }
    };

    const handleClick = () => {
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(nodesData.map(n => n.mesh));
      if (intersects.length > 0) {
        const found = nodesData.find(n => n.mesh === intersects[0].object);
        if (found) {
          onSelectEvent(found.event);
        }
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousemove', handlePointerMove);
    dom.addEventListener('click', handleClick);

    // 7. Animation Loop (performance.now() を使用)
    let animId: number;
    const startTime = performance.now();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startTime) / 1000;

      sweep.rotation.z = -elapsed * 1.5;

      nodesData.forEach((n, i) => {
        n.mesh.position.y = 0.5 + Math.sin(elapsed * 3 + i) * 0.2;
        n.mesh.rotation.y = elapsed;
      });

      gridGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.05;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousemove', handlePointerMove);
      dom.removeEventListener('click', handleClick);
      if (container.contains(dom)) {
        container.removeChild(dom);
      }
      renderer.dispose();
    };
  }, [events, onSelectEvent]);

  return (
    <div className="three-radar-wrapper">
      <div className="three-radar-container" ref={containerRef}>
        <div className="radar-hud-overlay">
          <div className="hud-top">
            <span className="hud-label">📡 3D SMART MONEY SCANNER</span>
            <span className="hud-live-tag">ACTIVE 360°</span>
          </div>
          <span className="radar-footer-guide">💡 ノードをホバーでオッズ確認 ｜ クリックでチャート切り替え</span>
        </div>
      </div>

      {hoveredEvent && (
        <div className="radar-tooltip-card" onClick={() => onSelectEvent(hoveredEvent)}>
          <div className="tooltip-header">
            <span className="tooltip-cat">{hoveredEvent.categoryLabel}</span>
            <span className="tooltip-prob">YES {hoveredEvent.worldProbYes}%</span>
          </div>
          <p className="tooltip-title">{hoveredEvent.titleJa}</p>
          <div className="tooltip-action">クリックして詳細・世論比較を開く →</div>
        </div>
      )}
    </div>
  );
};

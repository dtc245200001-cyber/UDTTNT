import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import tourConfig from '@/data/tour.json';

/**
 * Chuẩn hóa 6 mặt cube map
 */
export const normalizeCubeFaces = (faces = {}) => {
  return {
    front: faces.front || faces.f || faces.pz || faces.pz_image || '',
    right: faces.right || faces.r || faces.px || faces.px_image || '',
    back: faces.back || faces.b || faces.nz || faces.nz_image || '',
    left: faces.left || faces.l || faces.nx || faces.nx_image || '',
    up: faces.up || faces.u || faces.py || faces.py_image || '',
    down: faces.down || faces.d || faces.ny || faces.ny_image || '',
  };
};

/**
 * 6 mặt theo thứ tự Material của Three.js BoxGeometry
 * Index: 0: +X (Right), 1: -X (Left), 2: +Y (Up), 3: -Y (Down), 4: +Z (Front), 5: -Z (Back)
 */
const CUBE_FACES_CONFIG = [
  { key: 'right', label: 'RIGHT', coord: '+X' },
  { key: 'left', label: 'LEFT', coord: '-X' },
  { key: 'up', label: 'UP (TRẦN)', coord: '+Y' },
  { key: 'down', label: 'DOWN (SÀN)', coord: '-Y' },
  { key: 'front', label: 'FRONT (CHÍNH DIỆN)', coord: '+Z' },
  { key: 'back', label: 'BACK (PHÍA SAU)', coord: '-Z' },
];

/**
 * Hàm DUY NHẤT thiết lập góc xoay chuẩn cho nút floor-arrow
 * - arrowAngle = 0: đỉnh chevron chỉ RA XA camera theo hướng yaw của nút
 * - arrowAngle dương: mũi tên lệch sang PHẢI theo hướng nhìn
 */
export function applyFloorArrowTransform(mesh, hs) {
  if (!mesh) return;
  const yaw = THREE.MathUtils.degToRad(hs.yaw ?? 0);
  const extra = THREE.MathUtils.degToRad(hs.arrowAngle ?? 0);
  mesh.rotation.set(-Math.PI / 2, yaw + Math.PI - extra, 0, 'YXZ');
}

/**
 * Tạo canvas texture 512x512 cho nút floor-arrow:
 * - Vòng tròn viền trắng dày, bên trong trong suốt
 * - Mũi tên chevron "^" màu trắng chỉ hướng đi
 */
let cachedFloorArrowTexture = null;
function getFloorArrowTexture() {
  if (cachedFloorArrowTexture) return cachedFloorArrowTexture;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 512, 512);

  const cx = 256;
  const cy = 256;
  const radius = 205;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 16;

  // 1. Vòng tròn viền trắng dày, trong suốt ở giữa
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 36;
  ctx.stroke();

  // 2. Mũi tên chevron "^" màu trắng ở giữa
  ctx.beginPath();
  ctx.lineWidth = 44;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#FFFFFF';

  ctx.moveTo(165, 305);
  ctx.lineTo(256, 175);
  ctx.lineTo(347, 305);
  ctx.stroke();

  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  cachedFloorArrowTexture = texture;
  return texture;
}

/**
 * Tạo texture placeholder dự phòng khi thiếu ảnh
 */
const createFallbackTexture = (faceConfig, sceneTitle = '') => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2B2825';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#B8860B';
  ctx.lineWidth = 6;
  ctx.strokeRect(4, 4, 504, 504);

  ctx.fillStyle = '#D9A441';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sceneTitle || 'BẢO TÀNG LỊCH SỬ', 256, 220);

  ctx.fillStyle = '#F5EFE0';
  ctx.font = '18px sans-serif';
  ctx.fillText(`Mặt: ${faceConfig.label}`, 256, 270);

  return new THREE.CanvasTexture(canvas);
};

// Bộ nhớ đệm texture toàn cục
const textureCache = new Map();

/**
 * Preload ảnh của scene kế cận
 */
const preloadSceneTextures = (cubeFaces, textureLoader, maxAniso = 16) => {
  if (!cubeFaces) return;
  const normalized = normalizeCubeFaces(cubeFaces);
  Object.values(normalized).forEach((url) => {
    if (url && !textureCache.has(url)) {
      textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        tex.anisotropy = maxAniso;
        textureCache.set(url, tex);
      });
    }
  });
};

/**
 * Component Xem Tour 360° với Nút Floor-Arrow Nằm Phẳng Trên Sàn
 */
export const PanoramaCubeViewer = ({
  scenes: propScenes = null,
  initialSceneId = null,
  cubeFaces = null,
  title = 'Việt Nam thời Tiền Sử',
  className = '',
  autoRotateDefault = false,
  debug: propDebug = false,
}) => {
  const scenes = useMemo(() => {
    if (propScenes && propScenes.length > 0) return propScenes;
    return tourConfig.scenes || [];
  }, [propScenes]);

  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Quản lý Scene hiện tại
  const [currentSceneId, setCurrentSceneId] = useState(() => {
    if (initialSceneId) return initialSceneId;
    if (scenes && scenes.length > 0) return scenes[0].id;
    return tourConfig.defaultSceneId || 'tiensu-entrance';
  });

  const currentScene = useMemo(() => {
    if (!scenes || scenes.length === 0) return null;
    return scenes.find((s) => s.id === currentSceneId) || scenes[0];
  }, [scenes, currentSceneId]);

  // Trạng thái giao diện
  const [isAutoRotate, setIsAutoRotate] = useState(autoRotateDefault);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredHotspot, setHoveredHotspot] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [showGuidePill, setShowGuidePill] = useState(true);

  // Trạng thái chuyển cảnh liền mạch
  const [transitionOpacity, setTransitionOpacity] = useState(0);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const isTransitioningRef = useRef(false);

  // Chế độ Debug
  const isDebugMode = useMemo(() => {
    if (propDebug) return true;
    if (typeof window !== 'undefined') {
      const q = window.location.search;
      return q.includes('debug=1') || q.includes('debug=compass');
    }
    return false;
  }, [propDebug]);

  const isCompassDebug = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.location.search.includes('debug=compass');
    }
    return false;
  }, []);

  const [debugClickedPoint, setDebugClickedPoint] = useState(null);
  const [selectedDebugHotspot, setSelectedDebugHotspot] = useState(null);
  const [copiedNotification, setCopiedNotification] = useState('');
  const [hudView, setHudView] = useState({ yaw: 0, pitch: 0, fov: 75 });

  // Three.js instances ref
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const frameIdRef = useRef(null);
  const materialsRef = useRef([]);
  const cubeMeshRef = useRef(null);
  const hotspotsGroupRef = useRef(null);
  const floorHotspotsListRef = useRef([]); // Danh sách { mesh, hitMesh, data, isHovered }
  const textureLoaderRef = useRef(new THREE.TextureLoader());
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNdcRef = useRef(new THREE.Vector2(-999, -999));

  // Tương tác chuột & Quán tính (Inertia)
  const isUserInteractingRef = useRef(false);
  const onMouseDownMouseXRef = useRef(0);
  const onMouseDownMouseYRef = useRef(0);
  const onMouseDownLonRef = useRef(0);
  const onMouseDownLatRef = useRef(0);
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastPointerTimeRef = useRef(0);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  const lonRef = useRef(currentScene?.initialView?.yaw ?? 0);
  const latRef = useRef(currentScene?.initialView?.pitch ?? -8);
  const targetFovRef = useRef(currentScene?.initialView?.fov ?? 75);
  const isAutoRotateRef = useRef(autoRotateDefault);

  useEffect(() => {
    isAutoRotateRef.current = isAutoRotate;
  }, [isAutoRotate]);

  // Tự động ẩn pill gợi ý sau 6 giây
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGuidePill(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Preload các cảnh kế cận (cả phía trước và sau)
  useEffect(() => {
    if (currentScene?.hotspots && scenes) {
      const maxAniso = rendererRef.current?.capabilities?.getMaxAnisotropy() || 16;
      currentScene.hotspots.forEach((hs) => {
        const targetId = hs.target || hs.targetSceneId;
        if (targetId) {
          const next = scenes.find((s) => s.id === targetId);
          if (next?.cubeFaces) {
            preloadSceneTextures(next.cubeFaces, textureLoaderRef.current, maxAniso);
          }
        }
      });
    }
  }, [currentScene, scenes]);

  // 1. Khởi tạo Three.js Canvas & Scene một lần duy nhất
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1200);
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const materials = CUBE_FACES_CONFIG.map(() => {
      return new THREE.MeshBasicMaterial({ color: 0xffffff });
    });
    materialsRef.current = materials;

    const geometry = new THREE.BoxGeometry(500, 500, 500);
    geometry.scale(-1, 1, 1);

    const cubeMesh = new THREE.Mesh(geometry, materials);
    cubeMeshRef.current = cubeMesh;
    scene.add(cubeMesh);

    const hotspotsGroup = new THREE.Group();
    hotspotsGroupRef.current = hotspotsGroup;
    scene.add(hotspotsGroup);

    const clock = new THREE.Clock();
    let hudTimer = 0;

    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Xử lý Quán tính (Inertia) & Auto-rotate khi người dùng không kéo
      if (!isUserInteractingRef.current) {
        if (Math.abs(velocityRef.current.x) > 0.02 || Math.abs(velocityRef.current.y) > 0.02) {
          lonRef.current += velocityRef.current.x * 0.16;
          latRef.current += velocityRef.current.y * 0.16;
          velocityRef.current.x *= 0.92;
          velocityRef.current.y *= 0.92;
        } else {
          velocityRef.current.x = 0;
          velocityRef.current.y = 0;
          if (isAutoRotateRef.current) {
            const rotSpeed = tourConfig.settings?.autoRotateSpeed ?? 0.13;
            lonRef.current += rotSpeed;
          }
        }
      }

      // Giới hạn góc ngẩng/cúi (pitch: -85° đến 85°)
      latRef.current = Math.max(-85, Math.min(85, latRef.current));

      // Tọa độ cầu sang Descartes
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      camera.target.x = 500 * Math.sin(phi) * Math.sin(theta);
      camera.target.y = 500 * Math.cos(phi);
      camera.target.z = 500 * Math.sin(phi) * Math.cos(theta);

      camera.lookAt(camera.target);

      // Smooth zoom FOV
      if (Math.abs(camera.fov - targetFovRef.current) > 0.05) {
        camera.fov += (targetFovRef.current - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }

      // Cập nhật HUD định kỳ cho debug
      hudTimer += 1;
      if (hudTimer % 6 === 0) {
        setHudView({
          yaw: Math.round(((lonRef.current % 360) + 360) % 360),
          pitch: Math.round(latRef.current),
          fov: Math.round(camera.fov),
        });
      }

      // Hiệu ứng "thở" nhẹ cho các nút floor-arrow
      const breathingScale = 1.0 + 0.035 * Math.sin(elapsedTime * (Math.PI * 2 / 1.5));
      floorHotspotsListRef.current.forEach((item) => {
        if (!item.isHovered) {
          item.mesh.scale.set(breathingScale, breathingScale, breathingScale);
          item.material.opacity = 0.92;
        } else {
          item.mesh.scale.set(1.15, 1.15, 1.15);
          item.material.opacity = 1.0;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 500;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      geometry.dispose();
      materials.forEach((m) => m.dispose());
      renderer.dispose();
    };
  }, []);

  // 2. Tải Texture ban đầu hoặc khi đổi Scene (gán cả 6 mặt cùng lúc)
  useEffect(() => {
    const normalizedFaces = normalizeCubeFaces(currentScene?.cubeFaces || cubeFaces);
    const textureLoader = textureLoaderRef.current;
    const maxAniso = rendererRef.current?.capabilities?.getMaxAnisotropy() || 16;

    const loadTexturePromise = (url, faceConfig) => {
      return new Promise((resolve) => {
        if (!url) {
          resolve(createFallbackTexture(faceConfig, currentScene?.title));
          return;
        }
        const cached = textureCache.get(url);
        if (cached) {
          resolve(cached);
          return;
        }
        textureLoader.load(
          url,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            tex.anisotropy = maxAniso;
            textureCache.set(url, tex);
            resolve(tex);
          },
          undefined,
          () => {
            resolve(createFallbackTexture(faceConfig, currentScene?.title));
          }
        );
      });
    };

    Promise.all(
      CUBE_FACES_CONFIG.map((faceConfig) => {
        const url = normalizedFaces[faceConfig.key];
        return loadTexturePromise(url, faceConfig);
      })
    ).then((textures) => {
      textures.forEach((tex, index) => {
        const mat = materialsRef.current[index];
        if (mat && tex) {
          mat.map = tex;
          mat.needsUpdate = true;
        }
      });
    });
  }, [currentScene]);

  // 3. Dựng các nút Floor-Arrow Hotspots nằm phẳng trên sàn bảo tàng
  useEffect(() => {
    const group = hotspotsGroupRef.current;
    if (!group) return;

    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) obj.material.dispose();
    }
    floorHotspotsListRef.current = [];
    setHoveredHotspot(null);

    const floorArrowTex = getFloorArrowTexture();
    let hotspots = [...(currentScene?.hotspots || [])];

    // Chế độ Test Compass (?debug=compass)
    if (isCompassDebug) {
      hotspots = [
        { type: 'floor-arrow', yaw: 0, pitch: -28, arrowAngle: 0, label: 'Compass 0° (Bắc)', target: currentScene?.id },
        { type: 'floor-arrow', yaw: 90, pitch: -28, arrowAngle: 0, label: 'Compass 90° (Đông)', target: currentScene?.id },
        { type: 'floor-arrow', yaw: 180, pitch: -28, arrowAngle: 0, label: 'Compass 180° (Nam)', target: currentScene?.id },
        { type: 'floor-arrow', yaw: 270, pitch: -28, arrowAngle: 0, label: 'Compass 270° (Tây)', target: currentScene?.id },
      ];
    }

    hotspots.forEach((hs, idx) => {
      if (hs.type === 'floor-arrow') {
        const yaw = hs.yaw ?? 0;
        const pitch = hs.pitch ?? -26;
        const radius = 290;

        const phi = THREE.MathUtils.degToRad(90 - pitch);
        const theta = THREE.MathUtils.degToRad(yaw);

        const x = radius * Math.sin(phi) * Math.sin(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.cos(theta);

        // Kích thước PlaneGeometry tăng lên 64x64 như tour gốc
        const planeGeo = new THREE.PlaneGeometry(64, 64);
        const planeMat = new THREE.MeshBasicMaterial({
          map: floorArrowTex,
          transparent: true,
          opacity: 0.92,
          depthTest: false,
          side: THREE.DoubleSide,
        });

        const mesh = new THREE.Mesh(planeGeo, planeMat);
        mesh.renderOrder = 999;
        mesh.position.set(x, y, z);

        // Áp dụng hàm DUY NHẤT để định hướng mũi tên
        applyFloorArrowTransform(mesh, hs);

        mesh.userData = {
          hotspot: hs,
          index: idx,
        };

        // Hit-box vô hình mở rộng 105x105 để bắt click cực nhạy
        const hitGeo = new THREE.PlaneGeometry(105, 105);
        const hitMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0.001,
          depthTest: false,
          side: THREE.DoubleSide,
        });
        const hitMesh = new THREE.Mesh(hitGeo, hitMat);
        hitMesh.renderOrder = 998;
        hitMesh.userData = {
          hotspot: hs,
          index: idx,
          parentMesh: mesh,
        };
        mesh.add(hitMesh);

        group.add(mesh);

        floorHotspotsListRef.current.push({
          mesh,
          hitMesh,
          material: planeMat,
          data: hs,
          isHovered: false,
        });
      }
    });

    // Tự kiểm tra la bàn (Compass Test)
    if (isCompassDebug && floorHotspotsListRef.current.length === 4) {
      let allPass = true;
      floorHotspotsListRef.current.forEach((item) => {
        const mesh = item.mesh;
        const posNorm = new THREE.Vector3(mesh.position.x, 0, mesh.position.z).normalize();
        const chevronLocal = new THREE.Vector3(0, 1, 0).applyEuler(mesh.rotation);
        const chevronXZ = new THREE.Vector3(chevronLocal.x, 0, chevronLocal.z).normalize();
        const dot = posNorm.dot(chevronXZ);
        if (dot < 0.95) allPass = false;
      });
      if (allPass) {
        console.log('🧭 [Compass Test] Tất cả 4 mũi tên la bàn (yaw 0, 90, 180, 270) chỉ RA XA tâm: PASS ✅');
      } else {
        console.error('🧭 [Compass Test] Hướng mũi tên chưa chuẩn: FAIL ❌');
      }
    }
  }, [currentScene, isCompassDebug]);

  // 4. Chuyển Cảnh Liền Mạch & "Đi Sâu" Đúng Hướng (Tween camera -> Fade out -> Swap 6 mặt -> Fade in)
  const navigateToScene = useCallback(
    (targetSceneId, targetYaw = null, targetPitch = null, hotspotData = null) => {
      if (targetSceneId === currentSceneId || isTransitioningRef.current) return;
      const nextScene = scenes?.find((s) => s.id === targetSceneId);
      if (!nextScene) return;

      isTransitioningRef.current = true;
      setShowGuidePill(false);

      const camera = cameraRef.current;
      const textureLoader = textureLoaderRef.current;
      const maxAniso = rendererRef.current?.capabilities?.getMaxAnisotropy() || 16;

      // 1) Tween camera về hướng nút theo cung ngắn nhất và giảm FOV ~12° trong ~450ms
      const startYaw = lonRef.current;
      const destYaw = targetYaw !== null ? targetYaw : lonRef.current;
      let diffYaw = ((destYaw - startYaw + 180) % 360) - 180;
      if (diffYaw < -180) diffYaw += 360;

      const startPitch = latRef.current;
      const destPitch = targetPitch !== null ? targetPitch : latRef.current;
      const startFov = camera ? camera.fov : targetFovRef.current;
      const destFov = Math.max(45, startFov - 12);
      const tweenDuration = 450;
      const tweenStart = performance.now();

      const animateCameraTween = () => {
        const now = performance.now();
        const elapsed = now - tweenStart;
        const progress = Math.min(1, elapsed / tweenDuration);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

        lonRef.current = startYaw + diffYaw * ease;
        latRef.current = startPitch + (destPitch - startPitch) * ease;
        targetFovRef.current = startFov + (destFov - startFov) * ease;
        if (camera) {
          camera.fov = targetFovRef.current;
          camera.updateProjectionMatrix();
        }

        if (progress < 1) {
          requestAnimationFrame(animateCameraTween);
        } else {
          // 2) Bắt đầu fade ra màn đen ~250ms
          setTransitionOpacity(1);

          // 3) Tải ĐỦ 6 mặt của cảnh đích bằng Promise.all (dùng textureCache)
          let slowTimer = setTimeout(() => {
            setIsSlowLoading(true);
          }, 700);

          const nextFaces = normalizeCubeFaces(nextScene.cubeFaces);
          const loadNextTexture = (url, faceConfig) => {
            return new Promise((resolve) => {
              if (!url) {
                resolve(createFallbackTexture(faceConfig, nextScene.title));
                return;
              }
              const cached = textureCache.get(url);
              if (cached) {
                resolve(cached);
                return;
              }
              textureLoader.load(
                url,
                (tex) => {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  tex.minFilter = THREE.LinearMipmapLinearFilter;
                  tex.magFilter = THREE.LinearFilter;
                  tex.generateMipmaps = true;
                  tex.anisotropy = maxAniso;
                  textureCache.set(url, tex);
                  resolve(tex);
                },
                undefined,
                () => resolve(createFallbackTexture(faceConfig, nextScene.title))
              );
            });
          };

          Promise.all(
            CUBE_FACES_CONFIG.map((faceConfig) => {
              const url = nextFaces[faceConfig.key];
              return loadNextTexture(url, faceConfig);
            })
          ).then((textures) => {
            clearTimeout(slowTimer);
            setIsSlowLoading(false);

            // Gán đồng thời cả 6 material trong cùng một lượt
            textures.forEach((tex, idx) => {
              const mat = materialsRef.current[idx];
              if (mat && tex) {
                mat.map = tex;
                mat.needsUpdate = true;
              }
            });

            // 4) Đặt arrivalView hoặc initialView của cảnh đích (tuân theo 3DVista enterPointingToHorizon)
            const enterHorizon = tourConfig.settings?.enterPointingToHorizon !== false;
            const arrival =
              hotspotData?.arrivalView ||
              nextScene.arrivalView ||
              nextScene.initialView ||
              {};

            const nextYaw = arrival.yaw ?? nextScene.initialView?.yaw ?? 0;
            const nextPitch = arrival.pitch !== undefined ? arrival.pitch : (enterHorizon ? 0 : (nextScene.initialView?.pitch ?? 0));
            const nextFov = arrival.fov ?? nextScene.initialView?.fov ?? (tourConfig.settings?.defaultFov ?? 75);

            lonRef.current = nextYaw;
            latRef.current = nextPitch;
            targetFovRef.current = nextFov;
            if (camera) {
              camera.fov = nextFov;
              camera.updateProjectionMatrix();
            }

            setCurrentSceneId(targetSceneId);

            // Fade vào trong ~400ms
            setTimeout(() => {
              setTransitionOpacity(0);
              setTimeout(() => {
                isTransitioningRef.current = false;
              }, 400);
            }, 60);
          });
        }
      };

      requestAnimationFrame(animateCameraTween);
    },
    [currentSceneId, scenes]
  );

  // 5. Bắt Raycaster để Hover và Click Nút Sàn (Raycasting + Screen Proximity Fallback)
  const handlePointerMoveRaycast = useCallback(
    (clientX, clientY) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera || isTransitioningRef.current) return;

      const rect = container.getBoundingClientRect();
      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;
      mouseNdcRef.current.set(mouseX, mouseY);

      raycasterRef.current.setFromCamera(mouseNdcRef.current, camera);

      const targetMeshes = [];
      floorHotspotsListRef.current.forEach((item) => {
        targetMeshes.push(item.mesh);
        if (item.hitMesh) targetMeshes.push(item.hitMesh);
      });

      const intersects = raycasterRef.current.intersectObjects(targetMeshes, false);
      let hitHotspot = null;
      let hitMeshObj = null;

      if (intersects.length > 0) {
        // Ưu tiên nút gần tâm màn hình nhất khi nhiều nút cùng trúng
        intersects.sort((a, b) => {
          const va = a.object.position.clone().project(camera);
          const vb = b.object.position.clone().project(camera);
          return va.x * va.x + va.y * va.y - (vb.x * vb.x + vb.y * vb.y);
        });
        const hitObj = intersects[0].object;
        hitHotspot = hitObj.userData.hotspot;
        hitMeshObj = hitObj.userData.parentMesh || hitObj;
      } else {
        // Fallback: khoảng cách pixel trên màn hình (< 50px), chỉ xét nút trước mặt
        const camDir = camera.getWorldDirection(new THREE.Vector3());
        let closestDist = 50;

        for (const item of floorHotspotsListRef.current) {
          if (camDir.dot(item.mesh.position.clone().normalize()) <= 0.15) continue;

          const v = item.mesh.position.clone().project(camera);
          if (v.z < 1) {
            const sx = (v.x * 0.5 + 0.5) * rect.width;
            const sy = (-(v.y * 0.5) + 0.5) * rect.height;
            const screenDist = Math.hypot(clientX - rect.left - sx, clientY - rect.top - sy);
            if (screenDist < closestDist) {
              closestDist = screenDist;
              hitHotspot = item.data;
              hitMeshObj = item.mesh;
            }
          }
        }
      }

      if (hitHotspot && hitMeshObj) {
        floorHotspotsListRef.current.forEach((item) => {
          item.isHovered = item.mesh === hitMeshObj;
        });

        const v = hitMeshObj.position.clone().project(camera);
        const sx = (v.x * 0.5 + 0.5) * rect.width;
        const sy = (-(v.y * 0.5) + 0.5) * rect.height;

        setHoveredHotspot(hitHotspot);
        setTooltipPos({ x: sx, y: sy - 42 });
        container.style.cursor = 'pointer';
      } else {
        floorHotspotsListRef.current.forEach((item) => {
          item.isHovered = false;
        });
        setHoveredHotspot(null);
        container.style.cursor = isUserInteractingRef.current ? 'grabbing' : 'grab';
      }
    },
    []
  );

  // Xử lý Click / Touch để Di Chuyển Giữa Các Phòng
  const handlePointerClick = useCallback(
    (e) => {
      const container = containerRef.current;
      const camera = cameraRef.current;
      if (!container || !camera || isTransitioningRef.current) return;

      const rect = container.getBoundingClientRect();
      const clientX = e.clientX ?? (e.changedTouches && e.changedTouches[0]?.clientX) ?? 0;
      const clientY = e.clientY ?? (e.changedTouches && e.changedTouches[0]?.clientY) ?? 0;

      // Quãng đường kéo cho phép lên tới 16px để không bị hủy click do rung tay
      const distMoved = Math.hypot(
        clientX - pointerDownPosRef.current.x,
        clientY - pointerDownPosRef.current.y
      );
      if (distMoved > 16) return;

      const mouseX = ((clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -((clientY - rect.top) / rect.height) * 2 + 1;
      const clickVector = new THREE.Vector2(mouseX, mouseY);

      raycasterRef.current.setFromCamera(clickVector, camera);

      const targetMeshes = [];
      floorHotspotsListRef.current.forEach((item) => {
        targetMeshes.push(item.mesh);
        if (item.hitMesh) targetMeshes.push(item.hitMesh);
      });

      const intersects = raycasterRef.current.intersectObjects(targetMeshes, false);
      let hitHotspot = null;

      if (intersects.length > 0) {
        intersects.sort((a, b) => {
          const va = a.object.position.clone().project(camera);
          const vb = b.object.position.clone().project(camera);
          return va.x * va.x + va.y * va.y - (vb.x * vb.x + vb.y * vb.y);
        });
        hitHotspot = intersects[0].object.userData.hotspot;
      } else {
        const camDir = camera.getWorldDirection(new THREE.Vector3());
        let closestDist = 52;

        for (const item of floorHotspotsListRef.current) {
          if (camDir.dot(item.mesh.position.clone().normalize()) <= 0.15) continue;

          const v = item.mesh.position.clone().project(camera);
          if (v.z < 1) {
            const sx = (v.x * 0.5 + 0.5) * rect.width;
            const sy = (-(v.y * 0.5) + 0.5) * rect.height;
            const screenDist = Math.hypot(clientX - rect.left - sx, clientY - rect.top - sy);
            if (screenDist < closestDist) {
              closestDist = screenDist;
              hitHotspot = item.data;
            }
          }
        }
      }

      if (hitHotspot) {
        if (isDebugMode) {
          setSelectedDebugHotspot(hitHotspot);
        }

        const targetId = hitHotspot.target || hitHotspot.targetSceneId;
        if (targetId) {
          navigateToScene(targetId, hitHotspot.yaw, hitHotspot.pitch, hitHotspot);
        }
        return;
      }

      // Trong chế độ Debug: Click trên mặt sàn/tường để lấy tọa độ Yaw/Pitch
      if (isDebugMode && cubeMeshRef.current) {
        const hitPanorama = raycasterRef.current.intersectObject(cubeMeshRef.current);
        if (hitPanorama.length > 0) {
          const pt = hitPanorama[0].point;
          const r = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
          const phi = Math.acos(pt.y / r);
          const clickedPitch = Math.round(90 - THREE.MathUtils.radToDeg(phi));
          const theta = Math.atan2(pt.x, pt.z);
          const clickedYaw = Math.round(((THREE.MathUtils.radToDeg(theta) % 360) + 360) % 360);

          setDebugClickedPoint({ yaw: clickedYaw, pitch: clickedPitch });
          console.log(`[VirtualTour Debug] Clicked: yaw=${clickedYaw}, pitch=${clickedPitch}`);
        }
      }
    },
    [currentScene, isDebugMode, navigateToScene]
  );

  // 6. Xử lý chuột: Kiểu "nắm kéo thế giới" (Street View) + Quán tính (Inertia)
  const onPointerDown = useCallback((e) => {
    isUserInteractingRef.current = true;
    setShowGuidePill(false);

    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;

    pointerDownPosRef.current = { x: clientX, y: clientY };
    onMouseDownMouseXRef.current = clientX;
    onMouseDownMouseYRef.current = clientY;
    onMouseDownLonRef.current = lonRef.current;
    onMouseDownLatRef.current = latRef.current;

    velocityRef.current = { x: 0, y: 0 };
    lastPointerTimeRef.current = performance.now();
    lastPointerPosRef.current = { x: clientX, y: clientY };

    try {
      if (e.currentTarget?.setPointerCapture && e.pointerId !== undefined) {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    } catch (_) {}
  }, []);

  const onPointerMove = useCallback(
    (e) => {
      const clientX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? 0;
      const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? 0;

      if (isUserInteractingRef.current) {
        // "Nắm kéo thế giới": kéo sang phải thì ảnh trượt sang phải; kéo xuống thì ảnh trượt xuống
        lonRef.current = onMouseDownLonRef.current + (clientX - onMouseDownMouseXRef.current) * 0.16;
        latRef.current = onMouseDownLatRef.current + (clientY - onMouseDownMouseYRef.current) * 0.16;

        const now = performance.now();
        const dt = Math.max(1, now - lastPointerTimeRef.current);
        const dx = clientX - lastPointerPosRef.current.x;
        const dy = clientY - lastPointerPosRef.current.y;

        velocityRef.current = {
          x: (dx / dt) * 16,
          y: (dy / dt) * 16,
        };

        lastPointerTimeRef.current = now;
        lastPointerPosRef.current = { x: clientX, y: clientY };
      }

      handlePointerMoveRaycast(clientX, clientY);
    },
    [handlePointerMoveRaycast]
  );

  const onPointerUp = useCallback(
    (e) => {
      isUserInteractingRef.current = false;

      // Nếu dừng chuột trước khi thả thì triệt tiêu quán tính
      if (performance.now() - lastPointerTimeRef.current > 80) {
        velocityRef.current = { x: 0, y: 0 };
      }

      try {
        if (e.currentTarget?.releasePointerCapture && e.pointerId !== undefined) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch (_) {}

      handlePointerClick(e);
    },
    [handlePointerClick]
  );

  const onPointerCancel = useCallback(() => {
    isUserInteractingRef.current = false;
    velocityRef.current = { x: 0, y: 0 };
  }, []);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    setShowGuidePill(false);
    const zoomStep = 3.5;
    if (e.deltaY > 0) {
      targetFovRef.current = Math.min(85, targetFovRef.current + zoomStep);
    } else {
      targetFovRef.current = Math.max(45, targetFovRef.current - zoomStep);
    }
  }, []);

  // Điều khiển bàn phím (Mũi tên hoặc WASD, Space/Enter)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        lonRef.current -= 5;
        setShowGuidePill(false);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        lonRef.current += 5;
        setShowGuidePill(false);
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        latRef.current = Math.min(85, latRef.current + 4);
        setShowGuidePill(false);
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        latRef.current = Math.max(-85, latRef.current - 4);
        setShowGuidePill(false);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        setShowGuidePill(false);
        const currentYaw = ((lonRef.current % 360) + 360) % 360;
        const hotspots = currentScene?.hotspots || [];
        let bestHs = null;
        let minDiff = 50;

        hotspots.forEach((hs) => {
          const hsYaw = ((hs.yaw % 360) + 360) % 360;
          const diff = Math.min(Math.abs(currentYaw - hsYaw), 360 - Math.abs(currentYaw - hsYaw));
          if (diff < minDiff) {
            minDiff = diff;
            bestHs = hs;
          }
        });

        if (bestHs) {
          const targetId = bestHs.target || bestHs.targetSceneId;
          if (targetId) navigateToScene(targetId, bestHs.yaw, bestHs.pitch, bestHs);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScene, navigateToScene]);

  // Phím tắt căn chỉnh trong Debug Mode: [ ] để xoay arrowAngle, V lưu arrivalView, C copy mảng hotspots
  useEffect(() => {
    if (!isDebugMode) return;

    const handleKeyDown = (e) => {
      // Phím C: Copy toàn bộ mảng hotspots của cảnh hiện tại
      if (e.key === 'c' || e.key === 'C') {
        if (currentScene?.hotspots) {
          copyToClipboard(JSON.stringify(currentScene.hotspots, null, 2));
          setCopiedNotification('Đã copy toàn bộ mảng hotspots của cảnh!');
          return;
        }
      }

      if (!selectedDebugHotspot) return;

      // Phím V: Lưu góc nhìn hiện tại làm arrivalView của nút đang chọn
      if (e.key === 'v' || e.key === 'V') {
        const curYaw = Math.round(((lonRef.current % 360) + 360) % 360);
        const curPitch = Math.round(latRef.current);
        const curFov = Math.round(cameraRef.current?.fov || targetFovRef.current);
        selectedDebugHotspot.arrivalView = { yaw: curYaw, pitch: curPitch, fov: curFov };
        setSelectedDebugHotspot({ ...selectedDebugHotspot });
        setCopiedNotification(`Đã gán arrivalView: yaw=${curYaw}°, pitch=${curPitch}°`);
        return;
      }

      // Phím [ và ]: Xoay arrowAngle ±5° dùng hàm applyFloorArrowTransform duy nhất
      if (e.key === '[' || e.key === '{') {
        const newAngle = ((selectedDebugHotspot.arrowAngle ?? 0) - 5 + 360) % 360;
        selectedDebugHotspot.arrowAngle = newAngle;
        setSelectedDebugHotspot({ ...selectedDebugHotspot, arrowAngle: newAngle });

        const item = floorHotspotsListRef.current.find(
          (it) => it.data.target === selectedDebugHotspot.target
        );
        if (item) {
          applyFloorArrowTransform(item.mesh, selectedDebugHotspot);
        }
      } else if (e.key === ']' || e.key === '}') {
        const newAngle = ((selectedDebugHotspot.arrowAngle ?? 0) + 5) % 360;
        selectedDebugHotspot.arrowAngle = newAngle;
        setSelectedDebugHotspot({ ...selectedDebugHotspot, arrowAngle: newAngle });

        const item = floorHotspotsListRef.current.find(
          (it) => it.data.target === selectedDebugHotspot.target
        );
        if (item) {
          applyFloorArrowTransform(item.mesh, selectedDebugHotspot);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDebugMode, selectedDebugHotspot, currentScene]);

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedNotification('Đã copy vào clipboard!');
    setTimeout(() => setCopiedNotification(''), 2500);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) containerRef.current.requestFullscreen();
      else if (containerRef.current?.webkitRequestFullscreen) containerRef.current.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleZoomIn = () => {
    targetFovRef.current = Math.max(45, targetFovRef.current - 10);
  };

  const handleZoomOut = () => {
    targetFovRef.current = Math.min(85, targetFovRef.current + 10);
  };

  const handleResetView = () => {
    lonRef.current = currentScene?.initialView?.yaw ?? 0;
    latRef.current = currentScene?.initialView?.pitch ?? -8;
    targetFovRef.current = currentScene?.initialView?.fov ?? 75;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[540px] sm:h-[650px] rounded-3xl overflow-hidden shadow-2xl border border-[#5B3A1F]/30 bg-[#2B2825] select-none ${className}`}
    >
      {/* 1. Canvas Three.js với Pointer Events & Touch-Action None */}
      <div
        ref={canvasContainerRef}
        className="w-full h-full cursor-grab touch-none select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onWheel={onWheel}
      />

      {/* 2. Tooltip tên phòng đích khi Hover vào nút sàn */}
      {hoveredHotspot && transitionOpacity === 0 && (
        <div
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translate(-50%, -100%)',
          }}
          className="absolute z-30 pointer-events-none px-3.5 py-1.5 rounded-xl bg-[#2B170B]/95 backdrop-blur-md text-[#FBF8F1] border border-[#D9A441]/70 text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in whitespace-nowrap"
        >
          <span className="w-2 h-2 rounded-full bg-[#D9A441] animate-ping" />
          <span>{hoveredHotspot.label || 'Di chuyển đến điểm tiếp theo'}</span>
        </div>
      )}

      {/* 3. Lớp chuyển cảnh fade-out / fade-in liền mạch (Dissolve mượt mà, không giật) */}
      <div
        style={{
          opacity: transitionOpacity,
          pointerEvents: transitionOpacity > 0 ? 'auto' : 'none',
        }}
        className="absolute inset-0 bg-[#2B2825] z-30 transition-opacity duration-200 pointer-events-none flex items-center justify-center"
      >
        {isSlowLoading && (
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#3E2712]/95 border border-[#B8860B]/50 shadow-2xl text-[#FBF8F1]">
            <div className="w-4 h-4 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-[#D9A441]">Đang tải không gian...</span>
          </div>
        )}
      </div>

      {/* 4. Khung Căn Chỉnh Debug (?debug=1 hoặc ?debug=compass) */}
      {isDebugMode && (
        <div className="absolute top-4 left-4 z-40 p-3.5 rounded-2xl bg-black/90 backdrop-blur-xl border border-[#D9A441] text-white text-xs max-w-sm shadow-2xl space-y-2">
          <div className="flex items-center justify-between pb-1.5 border-b border-white/20">
            <span className="font-bold text-[#D9A441] uppercase tracking-wider">🛠️ Căn Chỉnh Tour</span>
            {copiedNotification && (
              <span className="text-emerald-400 text-[11px] font-semibold animate-pulse">
                {copiedNotification}
              </span>
            )}
          </div>

          {/* HUD Góc nhìn hiện tại */}
          <div className="p-2 rounded-xl bg-white/10 font-mono text-[11px] space-y-0.5">
            <div className="text-[#D9A441] font-bold">Cảnh: {currentScene?.id} ({currentScene?.title})</div>
            <div className="flex items-center gap-3">
              <span>Yaw: <b>{hudView.yaw}°</b></span>
              <span>Pitch: <b>{hudView.pitch}°</b></span>
              <span>FOV: <b>{hudView.fov}°</b></span>
            </div>
          </div>

          <div className="text-[11px] text-white/80">
            👉 Click vào sàn để lấy tọa độ | Phím <kbd className="px-1 bg-white/20 rounded">C</kbd> copy mảng hotspots
          </div>

          {debugClickedPoint && (
            <div className="p-2 rounded-xl bg-white/10 space-y-1">
              <div>
                Tọa độ click: <span className="text-[#D9A441] font-bold">yaw: {debugClickedPoint.yaw}°</span>,{' '}
                <span className="text-[#D9A441] font-bold">pitch: {debugClickedPoint.pitch}°</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(
                    JSON.stringify(
                      {
                        type: 'floor-arrow',
                        yaw: debugClickedPoint.yaw,
                        pitch: debugClickedPoint.pitch,
                        arrowAngle: 0,
                        target: 'phong-moi',
                        label: 'Phòng mới',
                      },
                      null,
                      2
                    )
                  )
                }
                className="w-full mt-1 py-1 rounded-lg bg-[#B8860B] hover:bg-[#D9A441] text-[#2B170B] font-bold text-[11px] cursor-pointer transition-colors"
              >
                📋 Copy Hotspot JSON
              </button>
            </div>
          )}

          {selectedDebugHotspot && (
            <div className="p-2 rounded-xl bg-amber-950/60 border border-[#D9A441]/50 space-y-1.5">
              <div className="font-semibold text-[#D9A441]">Nút: {selectedDebugHotspot.label}</div>
              <div className="text-[11px] text-white/90">
                arrowAngle: <span className="font-bold text-[#D9A441]">{selectedDebugHotspot.arrowAngle ?? 0}°</span>{' '}
                (Bấm phím <kbd className="px-1 bg-black/60 rounded text-[#D9A441]">[</kbd> hoặc{' '}
                <kbd className="px-1 bg-black/60 rounded text-[#D9A441]">]</kbd> để xoay)
              </div>
              <div className="text-[11px] text-white/90">
                Phím <kbd className="px-1 bg-black/60 rounded text-[#D9A441]">V</kbd>: Lưu góc nhìn hiện tại làm arrivalView
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(JSON.stringify(selectedDebugHotspot, null, 2))}
                className="w-full py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white font-semibold text-[11px] cursor-pointer transition-colors"
              >
                📋 Copy Thông Số Nút Đang Chọn
              </button>
            </div>
          )}
        </div>
      )}

      {/* 5. Gợi ý điều hướng trực quan góc dưới bên trái (Ẩn sau 6s hoặc sau tương tác đầu tiên) */}
      {showGuidePill && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-[#3E2712]/90 backdrop-blur-md border border-[#B8860B]/40 text-[#F5EFE0] text-xs shadow-xl transition-opacity duration-500 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[#D9A441] animate-pulse" />
          <span>Kéo chuột xoay 360° • Bấm mũi tên tròn trên sàn để di chuyển</span>
        </div>
      )}

      {/* 6. Bảng điều khiển tối giản góc dưới bên phải */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 sm:gap-2 p-1.5 rounded-2xl bg-[#3E2712]/90 backdrop-blur-md border border-[#B8860B]/40 shadow-xl">
        {/* Nút Bật/Tắt Xoay Tự Động */}
        <button
          type="button"
          onClick={() => setIsAutoRotate((prev) => !prev)}
          className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-300 ${
            isAutoRotate
              ? 'bg-[#B8860B] text-white shadow-md'
              : 'bg-[#5B3A1F]/70 text-[#F5EFE0] hover:bg-[#5B3A1F] hover:text-white'
          }`}
          title={isAutoRotate ? 'Tắt xoay tự động' : 'Bật xoay tự động'}
        >
          <svg className={`w-3.5 h-3.5 ${isAutoRotate ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden xs:inline">{isAutoRotate ? 'Đang xoay' : 'Xoay tự động'}</span>
        </button>

        <div className="w-[1px] h-5 bg-[#B8860B]/30 mx-0.5" />

        {/* Nút Phóng to (+) */}
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Phóng to"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Nút Thu nhỏ (-) */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Thu nhỏ"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" />
          </svg>
        </button>

        {/* Nút Đặt lại góc nhìn chính diện */}
        <button
          type="button"
          onClick={handleResetView}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95 hidden sm:flex cursor-pointer"
          title="Đặt lại góc nhìn chính diện"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        {/* Nút Toàn màn hình */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95 cursor-pointer"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isFullscreen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PanoramaCubeViewer;

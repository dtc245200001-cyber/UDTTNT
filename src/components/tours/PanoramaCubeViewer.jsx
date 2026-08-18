import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';

/**
 * Chuẩn hóa 6 mặt cube map từ nhiều quy ước đặt tên khác nhau
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
 * 6 mặt theo thứ tự mảng Material của Three.js BoxGeometry
 */
const CUBE_FACES_CONFIG = [
  { key: 'right', label: 'RIGHT (R)', coord: '+X', color: '#8B5CF6' },
  { key: 'left', label: 'LEFT (L)', coord: '-X', color: '#F97316' },
  { key: 'up', label: 'UP (U / TRẦN)', coord: '+Y', color: '#06B6D4' },
  { key: 'down', label: 'DOWN (D / SÀN)', coord: '-Y', color: '#EAB308' },
  { key: 'front', label: 'FRONT (F / CHÍNH DIỆN)', coord: '+Z', color: '#10B981' },
  { key: 'back', label: 'BACK (B / PHÍA SAU)', coord: '-Z', color: '#3B82F6' },
];

/**
 * Tạo canvas placeholder màu xám có nhãn mặt dự phòng khi thiếu ảnh
 */
const createFallbackTexture = (faceConfig) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#2B2825';
  ctx.fillRect(0, 0, 512, 512);
  ctx.strokeStyle = '#5B3A1F';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 504);

  ctx.fillStyle = '#D9A441';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`MẶT: ${faceConfig.key.toUpperCase()}`, 256, 230);
  ctx.fillStyle = '#A89F91';
  ctx.font = '16px sans-serif';
  ctx.fillText('(Chưa có ảnh mặt này)', 256, 280);

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
};

// Bộ nhớ đệm texture toàn cục để chuyển scene siêu mượt và không giật lag
const textureCache = new Map();

/**
 * Hàm preload 6 mặt ảnh của một scene vào cache bộ nhớ
 */
const preloadSceneTextures = (cubeFaces, textureLoader) => {
  if (!cubeFaces) return;
  const normalized = normalizeCubeFaces(cubeFaces);
  Object.values(normalized).forEach((url) => {
    if (url && !textureCache.has(url)) {
      textureLoader.load(url, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        textureCache.set(url, tex);
      });
    }
  });
};

/**
 * Component Xem Panorama 360° Đa Điểm Quét (Multi-Scene Virtual Tour)
 *
 * @param {Object} props
 * @param {Array} [props.scenes] - Danh sách các scene điểm quét liên thông
 * @param {string} [props.initialSceneId] - ID của scene hiển thị ban đầu
 * @param {Object} [props.cubeFaces] - Sử dụng khi chỉ xem 1 scene đơn lẻ { front, right, back, left, up, down }
 * @param {string} [props.title] - Tiêu đề tour hoặc phòng trưng bày
 * @param {string} [props.className] - CSS class tùy chỉnh cho container
 * @param {boolean} [props.autoRotateDefault=true] - Tự động xoay mặc định
 * @param {boolean} [props.debugMode=false] - Bật nhãn tên các mặt
 */
export const PanoramaCubeViewer = ({
  scenes = null,
  initialSceneId = null,
  cubeFaces = null,
  title = 'Việt Nam thời Tiền Sử',
  className = '',
  autoRotateDefault = true,
  debugMode: initialDebugMode = false,
}) => {
  const containerRef = useRef(null);
  const canvasContainerRef = useRef(null);

  // Quản lý Scene hiện tại
  const [currentSceneId, setCurrentSceneId] = useState(() => {
    if (scenes && scenes.length > 0) {
      return initialSceneId || scenes[0].id;
    }
    return 'single-scene';
  });

  // Lịch sử duyệt scene để cho phép nhảy lùi (Back navigation)
  const [sceneHistory, setSceneHistory] = useState([]);
  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);

  // Trạng thái UI
  const [isAutoRotate, setIsAutoRotate] = useState(autoRotateDefault);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [debugMode, setDebugMode] = useState(initialDebugMode);
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tọa độ màn hình 2D của các hotspot được chiếu từ không gian 3D
  const [projectedHotspots, setProjectedHotspots] = useState([]);

  // Lấy dữ liệu scene hiện tại
  const currentScene = useMemo(() => {
    if (scenes && scenes.length > 0) {
      const found = scenes.find((s) => s.id === currentSceneId);
      return found || scenes[0];
    }
    return {
      id: 'single-scene',
      title: title,
      subtitle: 'Không gian tham quan 360°',
      cubeFaces: cubeFaces || {},
      hotspots: [],
      initialYaw: 0,
      initialPitch: 0,
    };
  }, [scenes, currentSceneId, cubeFaces, title]);

  // Three.js instances ref
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const frameIdRef = useRef(null);
  const materialsRef = useRef([]);
  const cubeMeshRef = useRef(null);
  const textureLoaderRef = useRef(new THREE.TextureLoader());

  // Góc xoay & camera
  const isUserInteractingRef = useRef(false);
  const onMouseDownMouseXRef = useRef(0);
  const onMouseDownMouseYRef = useRef(0);
  const lonRef = useRef(currentScene?.initialYaw || 0); // Kinh độ (yaw)
  const latRef = useRef(currentScene?.initialPitch || 0); // Vĩ độ (pitch)
  const onMouseDownLonRef = useRef(0);
  const onMouseDownLatRef = useRef(0);
  const targetFovRef = useRef(75); // Field of View
  const touchStartDistRef = useRef(0);
  const isAutoRotateRef = useRef(autoRotateDefault);

  useEffect(() => {
    isAutoRotateRef.current = isAutoRotate;
  }, [isAutoRotate]);

  useEffect(() => {
    setDebugMode(initialDebugMode);
  }, [initialDebugMode]);

  // 1. Tự động Preload các Scene kế tiếp được liên kết qua Hotspot
  useEffect(() => {
    if (currentScene?.hotspots && scenes) {
      currentScene.hotspots.forEach((hs) => {
        const nextScene = scenes.find((s) => s.id === hs.targetSceneId);
        if (nextScene?.cubeFaces) {
          preloadSceneTextures(nextScene.cubeFaces, textureLoaderRef.current);
        }
      });
    }
  }, [currentScene, scenes]);

  // 2. Khởi tạo Three.js Canvas & Scene một lần duy nhất
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera với cấu hình chống méo và chất lượng cao
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, width / height, 1, 1100);
    camera.target = new THREE.Vector3(0, 0, 0);
    cameraRef.current = camera;

    // 2. WebGL Renderer với Anti-aliasing và True Color (sRGB 100% độ sáng gốc)
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // 3. Khởi tạo 6 Materials với màu trắng chuẩn 0xffffff (giữ 100% độ sáng gốc của ảnh panorama)
    const materials = CUBE_FACES_CONFIG.map((config) => {
      return new THREE.MeshBasicMaterial({ color: 0xffffff });
    });
    materialsRef.current = materials;

    // 4. Cube Geometry đảo ngược scale X để quan sát từ trong ra ngoài
    const geometry = new THREE.BoxGeometry(500, 500, 500);
    geometry.scale(-1, 1, 1);

    const cubeMesh = new THREE.Mesh(geometry, materials);
    cubeMeshRef.current = cubeMesh;
    scene.add(cubeMesh);

    // 5. Vòng lặp Render & Chiếu tọa độ Hotspots sang 2D màn hình
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);

      if (isAutoRotateRef.current && !isUserInteractingRef.current) {
        lonRef.current += 0.12;
      }

      // Giới hạn góc ngẩng/cúi (pitch: -85° đến 85°)
      latRef.current = Math.max(-85, Math.min(85, latRef.current));

      // Tọa độ cầu sang Descartes
      const phi = THREE.MathUtils.degToRad(90 - latRef.current);
      const theta = THREE.MathUtils.degToRad(lonRef.current);

      camera.target.x = 500 * Math.sin(phi) * Math.cos(theta);
      camera.target.y = 500 * Math.cos(phi);
      camera.target.z = 500 * Math.sin(phi) * Math.sin(theta);

      camera.lookAt(camera.target);

      // Smooth zoom FOV
      if (Math.abs(camera.fov - targetFovRef.current) > 0.1) {
        camera.fov += (targetFovRef.current - camera.fov) * 0.1;
        camera.updateProjectionMatrix();
      }

      renderer.render(scene, camera);

      // Chiếu tọa độ 3D của các hotspots sang tọa độ 2D màn hình
      if (currentScene?.hotspots && currentScene.hotspots.length > 0 && containerRef.current) {
        const cWidth = containerRef.current.clientWidth;
        const cHeight = containerRef.current.clientHeight;

        const projected = currentScene.hotspots.map((hs) => {
          const hPhi = THREE.MathUtils.degToRad(90 - hs.pitch);
          const hTheta = THREE.MathUtils.degToRad(hs.yaw);

          // Vector 3D của hotspot nằm trên mặt cầu bán kính 450
          const v3d = new THREE.Vector3(
            450 * Math.sin(hPhi) * Math.sin(hTheta),
            450 * Math.cos(hPhi),
            450 * Math.sin(hPhi) * Math.cos(hTheta)
          );

          v3d.project(camera);

          // Kiểm tra xem hotspot có nằm trước mặt camera hay không (z < 1)
          const isVisible = v3d.z < 1;
          const screenX = (v3d.x * 0.5 + 0.5) * cWidth;
          const screenY = (-(v3d.y * 0.5) + 0.5) * cHeight;

          return {
            ...hs,
            isVisible,
            screenX,
            screenY,
          };
        });

        setProjectedHotspots(projected);
      } else {
        setProjectedHotspots([]);
      }
    };

    animate();

    // 6. Xử lý Resize container mượt mà
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;
      if (newWidth > 0 && newHeight > 0) {
        camera.aspect = newWidth / newHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(newWidth, newHeight);
      }
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(container);

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      resizeObserver.disconnect();
      materials.forEach((m) => {
        if (m.map) m.map.dispose();
        m.dispose();
      });
      geometry.dispose();
      renderer.dispose();
      if (container && renderer.domElement) {
        container.innerHTML = '';
      }
    };
  }, []);

  // 3. Tải & Áp dụng Texture cho Scene hiện tại (với Crossfade và Preload)
  useEffect(() => {
    if (!currentScene?.cubeFaces || materialsRef.current.length === 0) return;

    const normalizedFaces = normalizeCubeFaces(currentScene.cubeFaces);
    const textureLoader = textureLoaderRef.current;

    setIsLoading(true);
    let loadedLocal = 0;

    CUBE_FACES_CONFIG.forEach((faceConfig, index) => {
      const imageUrl = normalizedFaces[faceConfig.key];
      const material = materialsRef.current[index];
      if (!material) return;

      if (!imageUrl) {
        material.map = createFallbackTexture(faceConfig);
        material.needsUpdate = true;
        loadedLocal += 1;
        if (loadedLocal >= 6) setIsLoading(false);
        return;
      }

      // Nếu đã có sẵn trong cache thì load ngay lập tức
      if (textureCache.has(imageUrl)) {
        const cachedTexture = textureCache.get(imageUrl);
        material.color.setHex(0xffffff);
        material.map = cachedTexture;
        material.needsUpdate = true;
        loadedLocal += 1;
        if (loadedLocal >= 6) setIsLoading(false);
      } else {
        // Tải ảnh độ phân giải gốc, bật Texture filtering chống răng cưa và sắc nét
        textureLoader.load(
          imageUrl,
          (tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearMipmapLinearFilter;
            tex.magFilter = THREE.LinearFilter;
            tex.generateMipmaps = true;
            textureCache.set(imageUrl, tex);

            material.color.setHex(0xffffff);
            material.map = tex;
            material.needsUpdate = true;
            loadedLocal += 1;
            if (loadedLocal >= 6) setIsLoading(false);
          },
          undefined,
          (err) => {
            console.warn(`[PanoramaCubeViewer] Lỗi tải ảnh mặt "${faceConfig.key}" (${imageUrl}):`, err);
            material.color.setHex(0xffffff);
            material.map = createFallbackTexture(faceConfig);
            material.needsUpdate = true;
            loadedLocal += 1;
            if (loadedLocal >= 6) setIsLoading(false);
          }
        );
      }
    });
  }, [currentScene]);

  // 4. Xử lý Chuyển Scene Mượt mà (Smooth Scene Transition via Hotspot / Menu)
  const navigateToScene = useCallback(
    (targetSceneId, targetYaw = null, targetPitch = null) => {
      if (targetSceneId === currentSceneId) return;

      // Lưu lại scene trước đó vào lịch sử
      setSceneHistory((prev) => [...prev, currentSceneId]);

      // Kích hoạt hiệu ứng Dissolve Transition (~500ms)
      setIsSceneTransitioning(true);

      // Nếu có yaw/pitch hướng tới, xoay camera nhẹ về phía đó
      if (targetYaw !== null) {
        lonRef.current = targetYaw;
      }
      if (targetPitch !== null) {
        latRef.current = targetPitch;
      }

      setTimeout(() => {
        setCurrentSceneId(targetSceneId);

        // Sau khi đổi scene, reset lại góc nhìn theo scene mới
        const nextScene = scenes?.find((s) => s.id === targetSceneId);
        if (nextScene) {
          lonRef.current = nextScene.initialYaw || 0;
          latRef.current = nextScene.initialPitch || 0;
        }

        setTimeout(() => {
          setIsSceneTransitioning(false);
        }, 200);
      }, 300);
    },
    [currentSceneId, scenes]
  );

  // Quay lại Scene trước đó (Go Back)
  const handleGoBack = useCallback(() => {
    if (sceneHistory.length === 0) return;
    const prevSceneId = sceneHistory[sceneHistory.length - 1];
    setSceneHistory((prev) => prev.slice(0, -1));

    setIsSceneTransitioning(true);
    setTimeout(() => {
      setCurrentSceneId(prevSceneId);
      setTimeout(() => {
        setIsSceneTransitioning(false);
      }, 200);
    }, 300);
  }, [sceneHistory]);

  // Xử lý Sự kiện Chuột (Mouse Drag)
  const onPointerDown = useCallback((e) => {
    isUserInteractingRef.current = true;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    onMouseDownMouseXRef.current = clientX;
    onMouseDownMouseYRef.current = clientY;
    onMouseDownLonRef.current = lonRef.current;
    onMouseDownLatRef.current = latRef.current;
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!isUserInteractingRef.current) return;
    const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

    lonRef.current = (onMouseDownMouseXRef.current - clientX) * 0.15 + onMouseDownLonRef.current;
    latRef.current = (clientY - onMouseDownMouseYRef.current) * 0.15 + onMouseDownLatRef.current;
  }, []);

  const onPointerUp = useCallback(() => {
    isUserInteractingRef.current = false;
  }, []);

  // Xử lý Cuộn chuột Zoom (Giới hạn FOV từ 45° đến 85° để bảo đảm ảnh sắc nét, không vỡ hạt và không méo rìa)
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const zoomStep = 3.5;
    if (e.deltaY > 0) {
      targetFovRef.current = Math.min(85, targetFovRef.current + zoomStep);
    } else {
      targetFovRef.current = Math.max(45, targetFovRef.current - zoomStep);
    }
  }, []);

  // Cảm ứng Mobile (Swipe & Pinch to Zoom)
  const onTouchStart = useCallback(
    (e) => {
      if (e.touches.length === 1) {
        onPointerDown(e);
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        touchStartDistRef.current = Math.sqrt(dx * dx + dy * dy);
      }
    },
    [onPointerDown]
  );

  const onTouchMove = useCallback(
    (e) => {
      if (e.touches.length === 1) {
        onPointerMove(e);
      } else if (e.touches.length === 2 && touchStartDistRef.current > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        const diff = touchStartDistRef.current - currentDist;

        targetFovRef.current = Math.max(45, Math.min(85, targetFovRef.current + diff * 0.08));
        touchStartDistRef.current = currentDist;
      }
    },
    [onPointerMove]
  );

  // Fullscreen
  const toggleFullscreen = () => {
    const elem = containerRef.current;
    if (!elem) return;

    if (!document.fullscreenElement) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const handleZoomIn = () => {
    targetFovRef.current = Math.max(45, targetFovRef.current - 10);
  };

  const handleZoomOut = () => {
    targetFovRef.current = Math.min(85, targetFovRef.current + 10);
  };

  const handleResetView = () => {
    lonRef.current = currentScene?.initialYaw || 0;
    latRef.current = currentScene?.initialPitch || 0;
    targetFovRef.current = 75;
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[540px] sm:h-[650px] rounded-3xl overflow-hidden shadow-2xl border border-[#5B3A1F]/30 bg-[#2B2825] select-none ${className}`}
    >
      {/* 1. Canvas Three.js hiển thị Cube Map */}
      <div
        ref={canvasContainerRef}
        className={`w-full h-full cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
          isSceneTransitioning ? 'opacity-30 blur-xs' : 'opacity-100 blur-none'
        }`}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onPointerUp}
      />

      {/* 2. Các Hotspots Điều hướng Di chuyển 3D trên Sàn nhà */}
      {!isSceneTransitioning &&
        projectedHotspots.map((hs) => {
          if (!hs.isVisible) return null;

          return (
            <div
              key={hs.id}
              style={{
                left: `${hs.screenX}px`,
                top: `${hs.screenY}px`,
                transform: 'translate(-50%, -50%)',
              }}
              className="absolute z-20 pointer-events-auto cursor-pointer group/hs"
              onClick={(e) => {
                e.stopPropagation();
                navigateToScene(hs.targetSceneId, hs.yaw, hs.pitch);
              }}
            >
              {/* Tooltip nhãn điểm đến khi hover */}
              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-3.5 py-1.5 rounded-xl bg-[#3E2712]/95 backdrop-blur-md text-[#FBF8F1] border border-[#B8860B]/50 text-xs font-semibold whitespace-nowrap shadow-xl opacity-0 group-hover/hs:opacity-100 group-hover/hs:-translate-y-1 transition-all duration-300 pointer-events-none flex items-center gap-1.5 z-30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D9A441] animate-ping" />
                <span>{hs.label}</span>
                <svg className="w-3.5 h-3.5 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </div>

              {/* Vòng tròn hiệu ứng sóng lan tỏa trên sàn (Pulsing Radar Wave) */}
              <div className="absolute inset-0 -m-3 rounded-full bg-[#D9A441]/25 animate-ping pointer-events-none" />

              {/* Điểm Hotspot tròn chính */}
              <div className="relative w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/80 flex items-center justify-center shadow-[0_0_20px_rgba(217,164,65,0.6)] group-hover/hs:scale-115 group-hover/hs:bg-[#B8860B]/90 group-hover/hs:border-[#D9A441] transition-all duration-300">
                {/* Vòng đệm trong */}
                <div className="w-8 h-8 rounded-full bg-white/70 group-hover/hs:bg-white flex items-center justify-center shadow-inner transition-colors">
                  {/* Mũi tên chỉ hướng */}
                  <svg
                    className="w-5 h-5 text-[#5B3A1F] group-hover/hs:text-[#B8860B] transform group-hover/hs:-translate-y-0.5 transition-all duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="3"
                      d="M5 10l7-7m0 0l7 7m-7-7v18"
                    />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}

      {/* 3. Lớp chuyển cảnh mượt mà (Crossfade / Dissolve Overlay) */}
      {isSceneTransitioning && (
        <div className="absolute inset-0 bg-[#2B2825]/60 backdrop-blur-xs flex items-center justify-center z-30 transition-opacity duration-300 pointer-events-none">
          <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#3E2712]/90 border border-[#B8860B]/50 shadow-2xl text-[#FBF8F1]">
            <div className="w-5 h-5 border-2 border-[#D9A441] border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium font-serif">Đang di chuyển đến không gian mới...</span>
          </div>
        </div>
      )}

      {/* 4. Lớp Loading khi mới tải */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#2B2825]/90 backdrop-blur-sm flex flex-col items-center justify-center z-40 transition-opacity duration-500">
          <div className="w-12 h-12 border-3 border-[#B8860B]/30 border-t-[#D9A441] rounded-full animate-spin mb-4" />
          <p className="text-[#FBF8F1] font-serif font-semibold text-base mb-1">
            Đang tải không gian 360° độ nét cao...
          </p>
          <p className="text-xs text-[#D9A441]/80 font-sans">
            Tối ưu hóa hình ảnh cube map sắc nét
          </p>
        </div>
      )}

      {/* 5. Header Breadcrumb & Điều hướng Không gian (Top Left) */}
      <div className="absolute top-4 left-4 z-20 max-w-[85%] flex items-center gap-2">
        {/* Nút Quay lại Điểm trước (nếu có lịch sử) */}
        {sceneHistory.length > 0 && (
          <button
            type="button"
            onClick={handleGoBack}
            className="p-2.5 rounded-xl bg-[#3E2712]/90 hover:bg-[#B8860B] text-white border border-[#B8860B]/40 shadow-lg transition-all active:scale-95 cursor-pointer"
            title="Quay lại điểm tham quan trước"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
        )}

        {/* Card Breadcrumb & Tên Điểm */}
        <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#3E2712]/90 backdrop-blur-md border border-[#B8860B]/40 text-[#FBF8F1] shadow-xl">
          <div className="w-7 h-7 rounded-lg bg-[#5B3A1F] flex items-center justify-center border border-[#B8860B]/30 text-[#D9A441] shadow-inner shrink-0">
            <svg className="w-4 h-4 animate-pulse" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-[#D9A441]">
              <span>Bảo tàng Lịch sử</span>
              <span>›</span>
              <span className="truncate">{title}</span>
            </div>
            <h3 className="text-xs sm:text-sm font-serif font-bold text-white tracking-wide truncate">
              {currentScene?.title || title}
            </h3>
          </div>

          {/* Nút mở danh sách tất cả các điểm quét (Scene Switcher) */}
          {scenes && scenes.length > 1 && (
            <button
              type="button"
              onClick={() => setIsSceneMenuOpen((prev) => !prev)}
              className="ml-1 px-2.5 py-1 rounded-lg bg-[#5B3A1F]/80 hover:bg-[#B8860B] text-[#F5EFE0] text-xs font-semibold border border-[#B8860B]/30 transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>{scenes.findIndex((s) => s.id === currentSceneId) + 1}/{scenes.length} Điểm</span>
              <svg className={`w-3 h-3 transform transition-transform ${isSceneMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* 6. Danh sách Dropdown Chọn nhanh Điểm quét (Scene Switcher Menu) */}
      {isSceneMenuOpen && scenes && (
        <div className="absolute top-18 left-4 z-30 w-72 sm:w-80 bg-[#2B2825]/95 backdrop-blur-xl border border-[#B8860B]/50 rounded-2xl p-3 shadow-2xl animate-fade-in">
          <div className="text-xs font-bold uppercase tracking-wider text-[#D9A441] mb-2 px-2 flex items-center justify-between">
            <span>Danh sách điểm quét ({scenes.length})</span>
            <button
              onClick={() => setIsSceneMenuOpen(false)}
              className="text-[#A89F91] hover:text-white"
            >
              ✕
            </button>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {scenes.map((scene, idx) => {
              const isCurrent = scene.id === currentSceneId;
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => {
                    navigateToScene(scene.id);
                    setIsSceneMenuOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 cursor-pointer ${
                    isCurrent
                      ? 'bg-[#B8860B] text-white shadow-md font-semibold'
                      : 'bg-[#3E2712]/60 hover:bg-[#5B3A1F] text-[#F5EFE0]'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${isCurrent ? 'bg-white text-[#5B3A1F]' : 'bg-[#5B3A1F] text-[#D9A441]'}`}>
                    {idx + 1}
                  </span>
                  <div className="truncate flex-1">
                    <div className="truncate">{scene.title}</div>
                    {scene.subtitle && (
                      <div className="text-[10px] text-white/60 truncate">{scene.subtitle}</div>
                    )}
                  </div>
                  {isCurrent && (
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 7. Hướng dẫn tương tác nhanh */}
      <div className="hidden sm:flex absolute top-4 right-4 z-20 items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white/80 text-xs pointer-events-none">
        <svg className="w-4 h-4 text-[#D9A441]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
        </svg>
        <span>Kéo để xoay • Bấm mũi tên tròn để di chuyển</span>
      </div>

      {/* 8. Bảng điều khiển góc dưới bên phải */}
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
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95"
          title="Phóng to (Zoom in)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </button>

        {/* Nút Thu nhỏ (-) */}
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95"
          title="Thu nhỏ (Zoom out)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 12H6" />
          </svg>
        </button>

        {/* Nút Đặt lại góc nhìn */}
        <button
          type="button"
          onClick={handleResetView}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95 hidden sm:flex"
          title="Đặt lại góc nhìn chính diện"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>

        <div className="w-[1px] h-5 bg-[#B8860B]/30 mx-0.5" />

        {/* Nút Toàn màn hình */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="p-2 rounded-xl bg-[#5B3A1F]/70 hover:bg-[#B8860B] text-[#F5EFE0] hover:text-white transition-all shadow-sm active:scale-95"
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Xem toàn màn hình'}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 4h-4m4 0l-5-5" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default PanoramaCubeViewer;

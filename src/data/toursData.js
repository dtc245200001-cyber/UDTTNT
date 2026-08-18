/**
 * Dữ liệu các tour 3D và các điểm quét (scenes) liên thông của Bảo tàng Lịch sử Quốc gia
 */

export const TIEN_SU_TOUR_SCENES = [
  {
    id: 'tiensu-sanh-don',
    title: 'Sảnh Đón & Cửa Phòng Tiền Sử',
    subtitle: 'Khu vực tiếp đón & bản đồ phân bố các nền văn hóa',
    cubeFaces: {
      front: '/tours/thoitiensu/front.jpg', // Biển hiệu "VIỆT NAM THỜI TIỀN SỬ"
      right: '/tours/thoitiensu/right.jpg', // Quầy lễ tân & tiếp đón
      back: '/tours/thoitiensu/back.jpg',   // Sảnh bát giác lớn
      left: '/tours/thoitiensu/left.jpg',   // Cầu thang & bản đồ
      up: '/tours/thoitiensu/up.jpg',       // Trần sảnh
      down: '/tours/thoitiensu/down.jpg',   // Sàn nhà
    },
    initialYaw: 0, // Nhìn thẳng vào cửa phòng Tiền Sử
    initialPitch: 0,
    hotspots: [
      {
        id: 'hs-to-phong-trung-bay',
        targetSceneId: 'tiensu-khu-trung-bay-1',
        yaw: 0,
        pitch: -18,
        label: 'Vào Không gian Trưng bày Hiện vật Tiền Sử',
      },
      {
        id: 'hs-to-sanh-bat-giac',
        targetSceneId: 'sanh-bat-giac-chinh',
        yaw: 180,
        pitch: -15,
        label: 'Ra Sảnh Bát Giác & Đèn chùm cổ',
      },
      {
        id: 'hs-to-quay-le-tan',
        targetSceneId: 'quay-tiep-don-thong-tin',
        yaw: 90,
        pitch: -14,
        label: 'Khu vực Quầy Tiếp đón & Hướng dẫn',
      },
    ],
  },
  {
    id: 'tiensu-khu-trung-bay-1',
    title: 'Phòng Trưng Bày Tiền Sử - Gian 1',
    subtitle: 'Văn hóa Sơn Vi, Hòa Bình & Công cụ đá sơ khai',
    cubeFaces: {
      front: '/tours/thoitiensu/front.jpg',
      right: '/tours/thoitiensu/right.jpg',
      back: '/tours/thoitiensu/back.jpg',
      left: '/tours/thoitiensu/left.jpg',
      up: '/tours/thoitiensu/up.jpg',
      down: '/tours/thoitiensu/down.jpg',
    },
    initialYaw: 15,
    initialPitch: -5,
    hotspots: [
      {
        id: 'hs-back-to-entrance',
        targetSceneId: 'tiensu-sanh-don',
        yaw: 180,
        pitch: -16,
        label: 'Quay lại Cửa vào Sảnh đón',
      },
      {
        id: 'hs-to-gian-2',
        targetSceneId: 'tiensu-khu-trung-bay-2',
        yaw: -10,
        pitch: -14,
        label: 'Tiến sâu vào Gian Trưng bày Đồ đồng & Đồ gốm',
      },
    ],
  },
  {
    id: 'tiensu-khu-trung-bay-2',
    title: 'Phòng Trưng Bày Tiền Sử - Gian 2',
    subtitle: 'Thời đại Kim khí & Nền văn hóa Đông Sơn sơ kỳ',
    cubeFaces: {
      front: '/tours/thoitiensu/front.jpg',
      right: '/tours/thoitiensu/right.jpg',
      back: '/tours/thoitiensu/back.jpg',
      left: '/tours/thoitiensu/left.jpg',
      up: '/tours/thoitiensu/up.jpg',
      down: '/tours/thoitiensu/down.jpg',
    },
    initialYaw: -30,
    initialPitch: 0,
    hotspots: [
      {
        id: 'hs-back-to-gian-1',
        targetSceneId: 'tiensu-khu-trung-bay-1',
        yaw: 175,
        pitch: -15,
        label: 'Quay lại Gian 1 - Văn hóa đồ đá',
      },
    ],
  },
  {
    id: 'sanh-bat-giac-chinh',
    title: 'Sảnh Trung Tâm Bát Giác',
    subtitle: 'Không gian kiến trúc Đông Dương & Trưng bày Gốm Bát Tràng',
    cubeFaces: {
      front: '/tours/thoitiensu/back.jpg', // Quay mặt vào sảnh bát giác
      right: '/tours/thoitiensu/left.jpg',
      back: '/tours/thoitiensu/front.jpg',
      left: '/tours/thoitiensu/right.jpg',
      up: '/tours/thoitiensu/up.jpg',
      down: '/tours/thoitiensu/down.jpg',
    },
    initialYaw: 0,
    initialPitch: 10,
    hotspots: [
      {
        id: 'hs-back-to-tiensu',
        targetSceneId: 'tiensu-sanh-don',
        yaw: 180,
        pitch: -15,
        label: 'Sang Cửa Phòng Tiền Sử',
      },
    ],
  },
  {
    id: 'quay-tiep-don-thong-tin',
    title: 'Khu Vực Quầy Lễ Tân & Tiếp Đón',
    subtitle: 'Nơi tiếp nhận đăng ký tham quan & thông tin hướng dẫn',
    cubeFaces: {
      front: '/tours/thoitiensu/right.jpg',
      right: '/tours/thoitiensu/back.jpg',
      back: '/tours/thoitiensu/left.jpg',
      left: '/tours/thoitiensu/front.jpg',
      up: '/tours/thoitiensu/up.jpg',
      down: '/tours/thoitiensu/down.jpg',
    },
    initialYaw: 0,
    initialPitch: -5,
    hotspots: [
      {
        id: 'hs-quay-lai-sanh-don',
        targetSceneId: 'tiensu-sanh-don',
        yaw: -90,
        pitch: -15,
        label: 'Quay lại Sảnh đón chính',
      },
    ],
  },
];

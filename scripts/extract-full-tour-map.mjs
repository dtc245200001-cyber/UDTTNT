import fs from 'fs';

const root = JSON.parse(fs.readFileSync('scripts/extracted_script_general.json', 'utf8'));
const defs = root.definitions || [];

// Create quick lookup by id
const defsById = {};
defs.forEach(d => {
  if (d.id) defsById[d.id] = d;
});

// Find mainPlayList
const playlistDef = defs.find(d => d.class === 'PlayList');
console.log('PlayList id:', playlistDef ? playlistDef.id : 'not found');

const playlistItems = playlistDef ? playlistDef.items : [];
console.log('Playlist items count:', playlistItems.length);

const fullTourData = [];

playlistItems.forEach((plItem, index) => {
  // plItem can be reference like "this.panorama_xxx" or object
  let panId = typeof plItem === 'string' ? plItem.replace('this.', '') : (plItem.panorama ? plItem.panorama.replace('this.', '') : plItem.id);
  const panDef = defsById[panId];
  
  // Camera def
  let cameraDef = null;
  if (panDef && panDef.camera) {
    const camId = typeof panDef.camera === 'string' ? panDef.camera.replace('this.', '') : panDef.camera.id;
    cameraDef = defsById[camId];
  }

  // Camera initial sequence
  let seqDef = null;
  if (cameraDef && cameraDef.initialSequence) {
    const seqId = typeof cameraDef.initialSequence === 'string' ? cameraDef.initialSequence.replace('this.', '') : cameraDef.initialSequence.id;
    seqDef = defsById[seqId];
  }

  // Hotspots:
  // In 3DVista, overlays can be attached in panDef.items or adjacentPanoramas
  const hotspots = [];
  
  // 1. Check adjacentPanoramas
  const adjList = (panDef && panDef.adjacentPanoramas) || [];
  adjList.forEach(adj => {
    // adj has: panorama, yaw, distance, backwardYaw, data.overlayID, select
    const targetPanId = adj.panorama ? adj.panorama.replace('this.', '') : null;
    const overlayId = adj.data && adj.data.overlayID ? adj.data.overlayID.replace('this.', '') : null;
    const overlayDef = overlayId ? defsById[overlayId] : null;
    
    let overlayItem = null;
    let clickAction = null;
    let targetIndex = null;
    
    if (overlayDef) {
      if (overlayDef.items && overlayDef.items[0]) {
        overlayItem = overlayDef.items[0];
      }
      if (overlayDef.areas && overlayDef.areas[0]) {
        const areaId = overlayDef.areas[0].replace('this.', '');
        const areaDef = defsById[areaId];
        if (areaDef && areaDef.click) {
          clickAction = areaDef.click;
          const matchIdx = clickAction.match(/setPlayListSelectedIndex\([^,]+,\s*(\d+)\)/);
          if (matchIdx) targetIndex = parseInt(matchIdx[1], 10);
        }
      }
    }
    
    hotspots.push({
      type: 'adjacent',
      targetPanId,
      targetIndex,
      adjYaw: adj.yaw,
      adjDistance: adj.distance,
      adjBackwardYaw: adj.backwardYaw,
      overlayYaw: overlayItem ? overlayItem.yaw : adj.yaw,
      overlayPitch: overlayItem ? overlayItem.pitch : null,
      overlayRoll: overlayItem ? overlayItem.roll : null,
      overlayHfov: overlayItem ? overlayItem.hfov : null,
      label: (overlayDef && overlayDef.data && overlayDef.data.label) || '',
      clickAction
    });
  });

  // 2. Check panDef.items
  const panItems = (panDef && panDef.items) || [];
  panItems.forEach(itemRef => {
    const itemId = typeof itemRef === 'string' ? itemRef.replace('this.', '') : itemRef.id;
    const itemDef = defsById[itemId];
    if (itemDef && itemDef.class === 'HotspotPanoramaOverlay') {
      const overlayItem = itemDef.items && itemDef.items[0];
      let clickAction = null;
      let targetIndex = null;
      if (itemDef.areas && itemDef.areas[0]) {
        const areaId = itemDef.areas[0].replace('this.', '');
        const areaDef = defsById[areaId];
        if (areaDef && areaDef.click) {
          clickAction = areaDef.click;
          const matchIdx = clickAction.match(/setPlayListSelectedIndex\([^,]+,\s*(\d+)\)/);
          if (matchIdx) targetIndex = parseInt(matchIdx[1], 10);
        }
      }
      hotspots.push({
        type: 'overlay',
        targetIndex,
        overlayYaw: overlayItem ? overlayItem.yaw : null,
        overlayPitch: overlayItem ? overlayItem.pitch : null,
        overlayRoll: overlayItem ? overlayItem.roll : null,
        label: (itemDef.data && itemDef.data.label) || '',
        clickAction
      });
    }
  });

  fullTourData.push({
    index,
    id: panId,
    label: (panDef && panDef.data && panDef.data.label) || (panDef && panDef.label) || '',
    camera: {
      initialYaw: cameraDef && cameraDef.initialPosition ? cameraDef.initialPosition.yaw : 0,
      initialPitch: cameraDef && cameraDef.initialPosition ? cameraDef.initialPosition.pitch : 0,
      enterPointingToHorizon: cameraDef ? cameraDef.enterPointingToHorizon : true
    },
    sequence: seqDef,
    hotspots
  });
});

fs.writeFileSync('scripts/3dvista_full_tour_map.json', JSON.stringify(fullTourData, null, 2), 'utf8');
console.log('Saved full tour map with', fullTourData.length, 'scenes to scripts/3dvista_full_tour_map.json');

// Print summary
fullTourData.forEach(s => {
  console.log(`[#${s.index}] ID: ${s.id}`);
  console.log(`     Label: "${s.label}"`);
  console.log(`     Camera Init: yaw=${s.camera.initialYaw}, pitch=${s.camera.initialPitch}`);
  console.log(`     Hotspots (${s.hotspots.length}):`);
  s.hotspots.forEach(h => {
    console.log(`       -> targetIdx: ${h.targetIndex}, yaw: ${h.overlayYaw ?? h.adjYaw}, pitch: ${h.overlayPitch}, roll: ${h.overlayRoll}, dist: ${h.adjDistance}m`);
  });
});

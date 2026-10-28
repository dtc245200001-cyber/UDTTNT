import fs from 'fs';

const root = JSON.parse(fs.readFileSync('scripts/extracted_script_general.json', 'utf8'));
const defs = root.definitions || [];

const defsById = {};
defs.forEach(d => {
  if (d.id) defsById[d.id] = d;
});

const playlistDef = defs.find(d => d.class === 'PlayList');
const playlistItems = playlistDef ? playlistDef.items : [];

// Map each item in playlist
const mappedScenes = playlistItems.map((item, index) => {
  const panRef = item.media || '';
  const panId = panRef.replace('this.', '');
  const panDef = defsById[panId] || {};

  const camRef = item.camera || panDef.camera || '';
  const camId = typeof camRef === 'string' ? camRef.replace('this.', '') : (camRef.id || '');
  const camDef = defsById[camId] || {};

  // Check sequence
  const seqRef = camDef.initialSequence || '';
  const seqId = typeof seqRef === 'string' ? seqRef.replace('this.', '') : (seqRef.id || '');
  const seqDef = defsById[seqId] || null;

  // Camera settings
  const initialYaw = camDef.initialPosition ? camDef.initialPosition.yaw : 0;
  const initialPitch = camDef.initialPosition ? camDef.initialPosition.pitch : 0;
  const enterPointingToHorizon = camDef.enterPointingToHorizon !== false;

  // Parse adjacentPanoramas
  const adjacent = (panDef.adjacentPanoramas || []).map(adj => {
    const targetPanId = adj.panorama ? adj.panorama.replace('this.', '') : '';
    const overlayId = adj.data && adj.data.overlayID ? adj.data.overlayID.replace('this.', '') : '';
    const overlayDef = defsById[overlayId] || {};
    const overlayItem = (overlayDef.items && overlayDef.items[0]) || {};
    
    let targetIndex = null;
    let clickCode = '';
    if (overlayDef.areas && overlayDef.areas[0]) {
      const areaId = overlayDef.areas[0].replace('this.', '');
      const areaDef = defsById[areaId] || {};
      clickCode = areaDef.click || '';
      const m = clickCode.match(/setPlayListSelectedIndex\([^,]+,\s*(\d+)\)/);
      if (m) targetIndex = parseInt(m[1], 10);
    }

    return {
      targetPanId,
      targetIndex,
      yaw: adj.yaw,
      distance: adj.distance,
      backwardYaw: adj.backwardYaw,
      overlay: {
        id: overlayId,
        yaw: overlayItem.yaw,
        pitch: overlayItem.pitch,
        roll: overlayItem.roll,
        hfov: overlayItem.hfov,
        vfov: overlayItem.vfov,
        label: (overlayDef.data && overlayDef.data.label) || ''
      },
      clickCode
    };
  });

  // Parse standalone items/overlays
  const standaloneOverlays = (panDef.items || []).map(itemRef => {
    const itemId = typeof itemRef === 'string' ? itemRef.replace('this.', '') : itemRef.id;
    const itemDef = defsById[itemId] || {};
    const overlayItem = (itemDef.items && itemDef.items[0]) || {};

    let targetIndex = null;
    let clickCode = '';
    if (itemDef.areas && itemDef.areas[0]) {
      const areaId = itemDef.areas[0].replace('this.', '');
      const areaDef = defsById[areaId] || {};
      clickCode = areaDef.click || '';
      const m = clickCode.match(/setPlayListSelectedIndex\([^,]+,\s*(\d+)\)/);
      if (m) targetIndex = parseInt(m[1], 10);
    }

    return {
      overlayId: itemId,
      targetIndex,
      yaw: overlayItem.yaw,
      pitch: overlayItem.pitch,
      roll: overlayItem.roll,
      label: (itemDef.data && itemDef.data.label) || '',
      clickCode
    };
  });

  return {
    playlistIndex: index,
    panoramaId: panId,
    label: (panDef.data && panDef.data.label) || '',
    camera: {
      initialYaw,
      initialPitch,
      enterPointingToHorizon,
      sequence: seqDef ? {
        id: seqId,
        name: seqDef.name || '',
        positions: seqDef.positions || []
      } : null
    },
    adjacent,
    standaloneOverlays
  };
});

fs.writeFileSync('scripts/3dvista_parsed_scenes.json', JSON.stringify(mappedScenes, null, 2), 'utf8');
console.log('Saved 3dvista_parsed_scenes.json');

// Log nice overview
mappedScenes.forEach(s => {
  console.log(`[Idx ${s.playlistIndex}] ID: ${s.panoramaId}`);
  console.log(`  Title/Label: "${s.label}"`);
  console.log(`  InitialView: yaw=${s.camera.initialYaw}, pitch=${s.camera.initialPitch}`);
  console.log(`  Adjacent (${s.adjacent.length}):`);
  s.adjacent.forEach(a => {
    console.log(`    -> to Index ${a.targetIndex} (${a.targetPanId}) | adjYaw=${a.yaw}° | dist=${a.distance}m | overlayYaw=${a.overlay.yaw}° | overlayPitch=${a.overlay.pitch}° | roll=${a.overlay.roll}°`);
  });
  if (s.standaloneOverlays.length) {
    console.log(`  Standalone Overlays (${s.standaloneOverlays.length}):`);
    s.standaloneOverlays.forEach(o => {
      console.log(`    * overlay to Index ${o.targetIndex} | yaw=${o.yaw}° | pitch=${o.pitch}°`);
    });
  }
});

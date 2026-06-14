(() => {
  // src/plugin.ts
  var exportDialog;
  var gmlDialog;
  var Action_OpenExportDialog;
  var formResult;
  var exportData;
  var deletables = [];
  BBPlugin.register("gamemaker-export", {
    title: "GameMaker Export",
    author: "GoldScale57",
    icon: "park",
    description: "Export to (unofficial) GameMaker model formats.",
    version: "1.0.0",
    variant: "desktop",
    repository: "https://github.com/StarJackal57/Blockbench-GameMaker-export",
    oninstall() {
    },
    onuninstall() {
    },
    onload() {
      setup();
    },
    onunload() {
      for (let deletable of deletables) {
        deletable.delete();
      }
      deletables.empty();
    }
  });
  function setup() {
    exportDialog = new Dialog({
      title: "GameMaker Export Settings",
      form: {
        filetype: {
          label: "Data Type",
          type: "select",
          value: "vBuff",
          description: "",
          options: {
            legacy: "Legacy (D3D, GMMOD)",
            vBuff: "Vertex Buffer"
          }
        },
        only_visible: {
          label: "Only Visible",
          type: "checkbox",
          value: true
        },
        normalize: {
          label: "Normalize",
          toggle_enabled: true,
          type: "select",
          value: "y",
          options: { x: "X", y: "Y", z: "Z" }
        },
        mirror: {
          label: "Flip",
          type: "inline_multi_select",
          options: { x: "X", y: "Y", z: "Z" },
          default: { x: false, y: false, z: true }
        },
        orientation: {
          label: "Reorder",
          type: "inline_select",
          options: { xyz: "XYZ", xzy: "XZY", yxz: "YXZ", yzx: "YZX", zxy: "ZXY", zyx: "ZYX" },
          default: "zxy"
        },
        scale: {
          label: "Scale",
          type: "number",
          value: 1,
          step: 0.1
        },
        vformat: {
          label: "Vertex Format",
          type: "inline_multi_select",
          condition: ({ filetype }) => ["vBuff"].includes(filetype),
          options: { normal: "Normal", texcoord: "Texcoord", color: "Color", boneindex: "BoneIndex" },
          default: { normal: true, texcoord: true, color: false, boneindex: true }
        },
        marker_colors: {
          label: "Marker Color",
          type: "inline_select",
          condition: ({ filetype, vformat }) => vformat.color || filetype == "legacy",
          options: { none: "None", standard: "Standard", pastel: "Pastel" }
        },
        split_meshes: {
          label: "Split Meshes",
          type: "checkbox",
          condition: ({ filetype }) => ["legacy"].includes(filetype)
        }
        /*
        include_vformat: {label: "Include Vertex Format", type: 'checkbox', default: false, condition: ({filetype}) => ['mBuff'].includes(filetype)},
        //*/
        /*
        export_button: {
        	label: "",
        	type: "buttons",
        	buttons: [
        		"Export Skeleton", 
        		"Generate GML"
        		],
        	click(_index) {
        		switch (_index) {
        			case 0: export_skeleton(); break;
        			case 1: generate_gml(); break;
        		}
        	}
        }
        //*/
      },
      onOpen() {
        ExportDialog_Open();
      },
      onFormChange(_result) {
      },
      onConfirm(_result) {
        ExportDialog_Confirm(_result);
        exportData = -1;
      },
      onCancel() {
        exportData = -1;
      }
    });
    deletables.push(exportDialog);
    Action_OpenExportDialog = new Action("openGameMakerExportDialog", {
      name: "Export GameMaker Model",
      icon: "park",
      click: function() {
        exportDialog.show();
      }
    });
    deletables.push(Action_OpenExportDialog);
    gmlDialog = new Dialog({
      title: "GML Code",
      form: {
        message: { label: "", type: "textarea", value: "" }
      }
    });
    deletables.push(gmlDialog);
    MenuBar.addAction(Action_OpenExportDialog, "file.export");
  }
  function ExportDialog_Open() {
    exportData = exportDataCollection();
    return;
  }
  function ExportDialog_Confirm(_result) {
    formResult = _result;
    if (isApp) {
      GMmodel_build();
      switch (formResult.filetype) {
        case "legacy":
          Blockbench.export({
            type: "GameMaker Model",
            extensions: ["d3d", "gmmod"],
            name: Project.name !== "" ? Project.name : "model",
            content: exportData.d3d_str,
            savetype: "text"
          });
          break;
        case "vBuff":
          Blockbench.export({
            type: "GameMaker Model",
            extensions: ["vbuff"],
            name: Project.name !== "" ? Project.name : "model",
            content: exportData.buffer,
            savetype: "text"
          });
          break;
      }
    }
  }
  function GMmodel_build() {
    exportData.byteLength = vertex_find_data(formResult);
    exportData.buffer = Buffer.alloc(exportData.byteLength);
    exportData.magnitude = normalize_magnitude();
    submesh_open(exportData);
    for (const _cube of exportData.cube) {
      let _parent = _cube.parent;
      if (!export_check(_cube)) continue;
      let faces = ["north", "east", "south", "west", "up", "down"];
      let o = [0, 0, 0];
      for (var j = 0; j < 3; j++) {
        let _axisNum = getAxisNumber(formResult.orientation[j]);
        o[j] = _cube.origin[_axisNum] * formResult.scale;
        if (formResult.mirror[formResult.orientation[j]]) {
          o[j] *= -1;
        }
      }
      let _vert = _cube.getGlobalVertexPositions();
      faces.forEach((face) => {
        let _face = _cube.faces[face];
        let vid = _face.getVertexIndices();
        let _tex = _face.getTexture();
        let _tex_w = _tex.uv_width ?? Project.texture_width;
        let _tex_h = _tex.uv_height ?? Project.texture_height;
        let v = [
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0],
          [0, 0, 0]
        ];
        for (var j2 = 0; j2 < 3; j2++) {
          let _axisNum = getAxisNumber(formResult.orientation[j2]);
          v[0][j2] = _vert[vid[0]][_axisNum] * formResult.scale;
          v[1][j2] = _vert[vid[1]][_axisNum] * formResult.scale;
          v[2][j2] = _vert[vid[2]][_axisNum] * formResult.scale;
          v[3][j2] = _vert[vid[3]][_axisNum] * formResult.scale;
          if (formResult.mirror[formResult.orientation[j2]]) {
            v[0][j2] *= -1;
            v[1][j2] *= -1;
            v[2][j2] *= -1;
            v[3][j2] *= -1;
          }
        }
        let m = new THREE.Matrix4();
        m.set(
          v[0][0],
          v[0][1],
          v[0][2],
          1,
          v[1][0],
          v[1][1],
          v[1][2],
          1,
          v[2][0],
          v[2][1],
          v[2][2],
          1,
          o[0],
          o[1],
          o[2],
          1
        );
        let _det = m.determinant();
        let _dir = _det != 0 ? Math.sign(_det) : 1;
        let edge1 = [...v[2]].V3_subtract(v[0]).V3_toThree();
        let edge2 = [...v[1]].V3_subtract(v[0]).V3_toThree();
        let n = new THREE.Vector3().crossVectors(edge2, edge1).multiplyScalar(_dir).normalize().toArray();
        let uv = [
          [_face.uv[0] / _tex_w, _face.uv[1] / _tex_h],
          [_face.uv[2] / _tex_w, _face.uv[1] / _tex_h],
          [_face.uv[2] / _tex_w, _face.uv[3] / _tex_h],
          [_face.uv[0] / _tex_w, _face.uv[3] / _tex_h]
        ];
        var c = formResult.marker_colors != "none" ? hex_string_to_rgb(markerColors[_cube.color][formResult.marker_colors]) : [255, 255, 255];
        let bidx = bone_get_index(exportData, _parent);
        for (let j3 = 0, k = 0; k < 6; k++) {
          vertex_add_point(exportData, v[j3], n, uv[j3], c[0], c[1], c[2], 255, bidx);
          if (k % 3 != 2) {
            j3 = (j3 + _dir) % 4;
          }
          if (j3 < 0) {
            j3 = 4 + j3;
          }
        }
      });
      if (formResult.split_meshes) {
        submesh_split(exportData);
      }
    }
    for (const _mesh of exportData.mesh) {
      let _parent = _mesh.parent;
      let o = [0, 0, 0];
      for (j = 0; j < 3; j++) {
        let _axisNum = getAxisNumber(formResult.orientation[j]);
        o[j] = _mesh.origin[_axisNum] * formResult.scale;
        if (formResult.mirror[formResult.orientation[j]]) {
          o[j] *= -1;
        }
      }
      _mesh.forAllFaces((_face) => {
        let vid = _face.getSortedVertices();
        let _tex = _face.getTexture();
        let _tex_w = _tex.uv_width ?? Project.texture_width;
        let _tex_h = _tex.uv_height ?? Project.texture_height;
        let tmp_v = [
          [..._mesh.vertices[vid[0]]],
          [..._mesh.vertices[vid[1]]],
          [..._mesh.vertices[vid[2]]]
        ];
        for (var j2 = 0; j2 < 3; j2++) {
          let _axisNum = getAxisNumber(formResult.orientation[j2]);
          tmp_v[0][j2] = _mesh.vertices[vid[0]][_axisNum];
          tmp_v[1][j2] = _mesh.vertices[vid[1]][_axisNum];
          tmp_v[2][j2] = _mesh.vertices[vid[2]][_axisNum];
          if (formResult.mirror[formResult.orientation[j2]]) {
            tmp_v[0][j2] *= -1;
            tmp_v[1][j2] *= -1;
            tmp_v[2][j2] *= -1;
          }
        }
        let m = new THREE.Matrix4();
        m.set(
          ...tmp_v[0],
          1,
          ...tmp_v[1],
          1,
          ...tmp_v[2],
          1,
          ...o,
          1
        );
        let _det = m.determinant();
        let _dir = _det < 0 ? -1 : 1;
        let v = [
          [..._mesh.vertices[vid[0]]],
          [0, 0, 0],
          [0, 0, 0]
        ];
        let n = [];
        for (var k = 0; k < 3; k++) {
          let _axisNum = getAxisNumber(formResult.orientation[k]);
          v[0][k] = (_mesh.vertices[vid[0]][_axisNum] + _mesh.origin[_axisNum]) * formResult.scale;
          n[k] = _face.getNormal(true)[_axisNum];
          if (formResult.mirror[formResult.orientation[k]]) {
            v[0][k] *= -1;
            n[k] *= -1;
          }
        }
        let uv0 = [
          (isNaN(_face.uv[vid[0]][0]) ? 0 : _face.uv[vid[0]][0]) / _tex_w,
          (isNaN(_face.uv[vid[0]][1]) ? 0 : _face.uv[vid[0]][1]) / _tex_h
        ];
        let _vert_count = _face.vertices.length;
        for (let _a = 1, j3 = _dir < 0 ? _vert_count : 0; _a + 1 < _vert_count; _a++) {
          j3 += _dir;
          for (var k = 0; k < 3; k++) {
            let _axisNum = getAxisNumber(formResult.orientation[k]);
            v[1][k] = (_mesh.vertices[vid[j3]][_axisNum] + _mesh.origin[_axisNum]) * formResult.scale;
            v[2][k] = (_mesh.vertices[vid[j3 + _dir]][_axisNum] + _mesh.origin[_axisNum]) * formResult.scale;
            if (formResult.mirror[formResult.orientation[k]]) {
              v[1][k] *= -1;
              v[2][k] *= -1;
            }
          }
          let uv1 = [
            (isNaN(_face.uv[vid[j3]][0]) ? 0 : _face.uv[vid[j3]][0]) / _tex_w,
            (isNaN(_face.uv[vid[j3]][1]) ? 0 : _face.uv[vid[j3]][1]) / _tex_h
          ];
          let uv2 = [
            (isNaN(_face.uv[vid[j3 + _dir]][0]) ? 0 : _face.uv[vid[j3 + _dir]][0]) / _tex_w,
            (isNaN(_face.uv[vid[j3 + _dir]][1]) ? 0 : _face.uv[vid[j3 + _dir]][1]) / _tex_h
          ];
          let c = formResult.marker_colors != "none" ? hex_string_to_rgb(markerColors[_mesh.color][formResult.marker_colors]) : [255, 255, 255];
          let bidx = bone_get_index(exportData, _parent);
          vertex_add_point(exportData, v[0], n, uv0, c[0], c[1], c[2], 255, bidx);
          vertex_add_point(exportData, v[1], n, uv1, c[0], c[1], c[2], 255, bidx);
          vertex_add_point(exportData, v[2], n, uv2, c[0], c[1], c[2], 255, bidx);
        }
      });
      if (formResult.split_meshes) {
        submesh_split(exportData);
      }
    }
    submesh_close(exportData);
    exportData.d3d_str = `100 ${exportData.d3d_entries}` + exportData.d3d_str;
  }
  function submesh_open(d) {
    d.d3d_str += "0 4 0 0 0 0 0 0 0 0 0\n";
    d.d3d_entries++;
  }
  function submesh_close(d) {
    d.d3d_str += "1 0 0 0 0 0 0 0 0 0 0\n";
    d.d3d_entries++;
  }
  function submesh_split(d) {
    submesh_close(d);
    submesh_open(d);
  }
  function vertex_add_point(d, pos, normal, uv, r, g, b, a, boneIdx) {
    let v = [...pos];
    if (formResult.normalize) {
      v[0] /= d.magnitude;
      v[1] /= d.magnitude;
      v[2] /= d.magnitude;
    }
    let _r = r, _g = g, _b = b, _a = a / 255;
    if (formResult.normal_map) {
      _r = Math.round((normal[0] * 0.5 + 0.5) * 255);
      _g = Math.round((normal[1] * 0.5 + 0.5) * 255);
      _b = Math.round((normal[2] * 0.5 + 0.5) * 255);
    }
    d.d3d_str += "9 ";
    d.d3d_str += `${v[0]} ${v[1]} ${v[2]} `;
    d.d3d_str += `${normal[0]} ${normal[1]} ${normal[2]} `;
    d.d3d_str += `${uv[0]} ${uv[1]} `;
    d.d3d_str += `${_r | _g << 8 | _b << 16} ${_a} `;
    d.d3d_str += "\n";
    d.d3d_entries++;
    d.offset = d.buffer.writeFloatLE(v[0], d.offset);
    d.offset = d.buffer.writeFloatLE(v[1], d.offset);
    d.offset = d.buffer.writeFloatLE(v[2], d.offset);
    if (formResult.vformat.normal) {
      d.offset = d.buffer.writeFloatLE(normal[0], d.offset);
      d.offset = d.buffer.writeFloatLE(normal[1], d.offset);
      d.offset = d.buffer.writeFloatLE(normal[2], d.offset);
    }
    if (formResult.vformat.texcoord) {
      d.offset = d.buffer.writeFloatLE(uv[0], d.offset);
      d.offset = d.buffer.writeFloatLE(uv[1], d.offset);
    }
    if (formResult.vformat.color) {
      d.offset = d.buffer.writeUInt8(_r, d.offset);
      d.offset = d.buffer.writeUInt8(_g, d.offset);
      d.offset = d.buffer.writeUInt8(_b, d.offset);
      d.offset = d.buffer.writeUInt8(_a * 255, d.offset);
    }
    if (formResult.vformat.boneindex) {
      d.offset = d.buffer.writeFloatLE(boneIdx, d.offset);
    }
  }
  function vertex_find_data() {
    var stride = 12;
    if (formResult.vformat.normal) {
      stride += 12;
    }
    if (formResult.vformat.texcoord) {
      stride += 8;
    }
    if (formResult.vformat.color) {
      stride += 4;
    }
    if (formResult.vformat.boneindex) {
      stride += 4;
    }
    var _entries = 0;
    for (let i = 0; i < Cube.all.length; i++) {
      _entries += 36;
    }
    for (let i = 0; i < Mesh.all.length; i++) {
      Mesh.all[i].forAllFaces((_face) => {
        _entries += (_face.vertices.length - 2) * 3;
      });
    }
    return _entries * stride;
  }
  function exportDataCollection() {
    console.log("Data Collection Init");
    let _data = {
      d3d_str: "",
      d3d_entries: 0,
      vertex_count: 0,
      cube: [],
      mesh: [],
      bone: [],
      boneData: {
        Count: 0,
        name: [],
        map: {},
        parent: [],
        inverseBind: [],
        x: [],
        y: [],
        z: [],
        xrotation: [],
        yrotation: [],
        zrotation: []
      },
      magnitude: 0,
      buffer: -1,
      offset: 0
    };
    for (const _bone of Group.all) {
      if (_bone.export) bone_add(_data, _bone);
    }
    for (const _bone of Locator.all) {
      if (_bone.export) bone_add(_data, _bone);
    }
    for (const _cube of Cube.all) {
      if (_cube.export) _data.cube.push(_cube);
    }
    for (const _mesh of Mesh.all) {
      if (_mesh.export) _data.mesh.push(_mesh);
    }
    return _data;
  }
  function export_check(elm) {
    if (!elm.export) return false;
    if (formResult.only_visible && !elm.visibility) return false;
    return true;
  }
  function hex_string_to_rgb(hex) {
    return [
      parseInt(hex.substring(1, 3), 16),
      parseInt(hex.substring(3, 5), 16),
      parseInt(hex.substring(5, 7), 16)
    ];
  }
  function bone_add(d, _bone) {
    let _boneData = d.boneData;
    _boneData.map[_bone.name] = _boneData.Count;
    _boneData.name.push(_bone.name);
    d.bone.push(_bone);
    _boneData.x[_boneData.Count] = _bone.origin[0];
    _boneData.y[_boneData.Count] = _bone.origin[1];
    _boneData.z[_boneData.Count] = _bone.origin[2];
    _boneData.xrotation[_boneData.Count] = _bone.rotation[0];
    _boneData.yrotation[_boneData.Count] = _bone.rotation[1];
    _boneData.zrotation[_boneData.Count] = _bone.rotation[2];
    _boneData.Count += 1;
  }
  function bone_get_index(d, _boneParent) {
    return _boneParent != "root" ? d.boneData.map[_boneParent.name] : -1;
  }
  function normalize_magnitude() {
    const formResult2 = exportDialog.getFormResult();
    if (formResult2.normalize == null) return 1;
    let _magnitude = 0;
    for (const _cube of exportData.cube) {
      switch (formResult2.normalize) {
        case "x":
          _magnitude = Math.max(_magnitude, Math.abs(_cube.to[0]), Math.abs(_cube.from[0]));
          break;
        case "y":
          _magnitude = Math.max(_magnitude, Math.abs(_cube.to[1]), Math.abs(_cube.from[1]));
          break;
        case "z":
          _magnitude = Math.max(_magnitude, Math.abs(_cube.to[2]), Math.abs(_cube.from[2]));
          break;
      }
    }
    for (const _mesh of exportData.mesh) {
      _mesh.forAllFaces((_face) => {
        for (let j2 = 0; j2 < _face.vertices.length; j2++) {
          let vpos = [..._face.mesh.vertices[_face.vertices[j2]]];
          vpos[0] += _mesh.origin[0];
          vpos[1] += _mesh.origin[1];
          vpos[2] += _mesh.origin[2];
          switch (formResult2.normalize) {
            case "x":
              _magnitude = Math.max(_magnitude, Math.abs(vpos[0]));
              break;
            case "y":
              _magnitude = Math.max(_magnitude, Math.abs(vpos[1]));
              break;
            case "z":
              _magnitude = Math.max(_magnitude, Math.abs(vpos[2]));
              break;
          }
        }
      });
    }
    return _magnitude != 0 ? _magnitude : 1;
  }
})();

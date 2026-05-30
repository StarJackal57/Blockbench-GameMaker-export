import { setupActions } from "./setup_actions";

//Dialog
var exportDialog;
var GMLDialog;
var Action_OpenExportDialog;
var formResult;
var exportData;

//Action
let openDialog;

//Plugin
BBPlugin.register('my_plugin', {
	title: 'GameMaker Export Options',
	author: 'GoldScale57',
	icon: 'park',
	description: "Export to (unofficial) GameMaker model formats.",
	version: '1.0.0',
	variant: 'desktop',

	oninstall(){},
	onuninstall(){},

	onload() {

		exportDialog = new Dialog({
			title: "GameMaker Export Settings",
			form: {
				//only_visible: {label: "Only Visible", type: "checkbox", value: true,},
				filetype: {label: "Data Type", type: "select", value: "vBuff",
					options: {legacy: "Legacy (D3D, GMMOD)", vBuff: "Vertex Buffer", /*mBuff: "Model Buffer"*/},
					description: "",
					},
				normalize: {label: "Normalize Positions", type: "checkbox", value: true},
				normalize_method: {label: "Normalize Method", type: "select", value: "y",
					options: {x: "X", y: "Y", z: "Z", max: "Max"},
					},
				mirror: {label: "Flip", type: 'inline_multi_select', 
					options: {x:"X", y:"Y", z:"Z"},
					default: {x: false, y: false, z: true},
					},
				orientation: { label: "Reorder", type: "inline_select", 
					options: {xyz: "XYZ", xzy: "XZY", yxz: "YXZ", yzx: "YZX", zxy: "ZXY", zyx: "ZYX"},
					default: "zxy",
					},
				//normalize: {label: "Normalize Positions", type: "checkbox", description: "DOES NOTHING YET!"},
				scale: {label: "Scale", type: "number", value: 1.0, step: 0.1},
				vformat: {label: "Vertex Format", type: "inline_multi_select",
					options: {normal: "Normal", texcoord: "Texcoord", color: "Color", boneindex: "BoneIndex"},
					default: {normal: true, texcoord: true, color: false, boneindex: true},
					},
				marker_colors: {label: "Marker Color", type: "inline_select", //Color Must be Active
					options: {none: "None", standard: "Standard", pastel: "Pastel"},
					},
				//split_meshes: {label: "Split Meshes", type: "checkbox", condition: ({filetype}) => ['legacy'].includes(filetype)},
				//include_vformat: {label: "Include Vertex Format", type: 'checkbox', default: false, condition: ({filetype}) => ['mBuff'].includes(filetype)},
				export_button: {label: "", type: "buttons",
					buttons: ["Export Skeleton", "Generate GML"],
					click(_index) {
						switch(_index) {
							case 0: export_skeleton(); break;
							case 1: generate_gml(); open_gml_dialog(); break;
						}
						}
					},
				},
			onOpen(){ ExportDialog_Open();},
			onFormChange(_result) {},
			onConfirm(_result) {ExportDialog_Confirm(_result); exportData = -1;},
			onCancel() {exportData = -1;}
			});

		GMLDialog = new Dialog({
			title: "GML Test",
			form: {main: {label: "Main", type: "textarea", readonly: true}}
			});
		
		Action_OpenExportDialog = new Action("openGameMakerExportDialog",{
			name: "Export GameMaker Model",
			icon: "park",
			click: function() {exportDialog.show();}
			});
		
		MenuBar.addAction(Action_OpenExportDialog, "file.export");
		},
	onunload() {

		openDialog.delete();
		exportDialog.delete();

		}

	});

function ExportDialog_Open() {
	
	//Export Data
	exportData = {
		d3d_str: "",
		d3d_entries: 0,

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
			zrotation: [],
			},
		magnitude: 0,
		
		buffer: -1,
		offset: 0,
		};

	//#region Bone Index Collection

	for (let i = 0; i < Group.all.length; i++) {bone_add(exportData, Group.all[i]);}
	for (let i = 0; i < Locator.all.length; i++) {bone_add(exportData, Locator.all[i]);}
	
	//#endregion

	for (let i = 0; i < OutlinerElement.all.length; i++) {

		let e = OutlinerElement.all[i];
		console.log(e.type);
		switch(e.type) {

			//case "armature": console.log(e); break;
			//case "armature_bone": console.log(e); break;

			case "cube":
				break;

			case "mesh":
				break;
			}

		}

	}

function ExportDialog_Confirm(_result) {
	formResult = _result;
	GMmodel_build_and_export();
	exportData = -1;
	}

function GMmodel_build_and_export() {
	
	let vdata = vertex_find_data( formResult );
	
	exportData.Buffer.alloc( vdata.byteLength );

	//#region Vertex Magnitude

	if (formResult.normalize) {

		/*
		for (let i = 0; i < Cube.all.length; i++) {

			let vpos = Cube.all[i].getGlobalVertexPositions();

			for (let k = 0; k < 8; k++) {

				switch(formResult.normalize_method) {
					case "x": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[k][0]) ); }; break;
					case "y": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[k][1]) ); }; break;
					case "z": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[k][2]) ); }; break;
					case "max": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.sqrt( (vpos[k][0] * vpos[k][0]) + (vpos[k][1] * vpos[k][1]) + (vpos[k][2] * vpos[k][2]) ) ); }; break;
					}
				}
			
			}
		/* */

		for (let i = 0; i < Mesh.all.length; i++) {
			
			let _mesh = Mesh.all[i];
			_mesh.forAllFaces(_face => {
				
				for(let j = 0; j < _face.vertices.length; j++) {

					let vpos = [..._face.mesh.vertices[ _face.vertices[j] ]];

					vpos[0] += _mesh.origin[0];
					vpos[1] += _mesh.origin[1];
					vpos[2] += _mesh.origin[2];
					
					//vpos = vpos.V3_toThree().applyMatrix4( _face.mesh.mesh.matrixWorld ).toArray();

					switch(formResult.normalize_method) {
						case "x": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[0]) ); }; break;
						case "y": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[1]) ); }; break;
						case "z": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.abs(vpos[2]) ); }; break;
						case "max": for (let j = 0; j < 4; j++) {_export.magnitude = Math.max(_export.magnitude, Math.sqrt( (vpos[0] * vpos[0]) + (vpos[1] * vpos[1]) + (vpos[2] * vpos[2]) ) );}; break;
						}
					
					}

				}
			);
			}
		}

	//#endregion

	submesh_open(_export);

	//Ignore For Now
	for (let i = 0; i < Cube.all.length; i++) {break;

		console.log(Cube.all[i].type);

		let _cube = Cube.all[i];
		let _parent = _cube.parent;

		if ( (!_cube.export) || (formResult.only_visible && !_cube.visibility) ) continue;

		let faces 	= ["north", "east", "south", "west", "up", "down"];
		
		//Origin
		let o = [0, 0, 0];
		for(var j = 0; j < 3; j++) {

			let _axisNum = getAxisNumber( formResult.orientation[j] ) ;
			o[j] = _cube.origin[ _axisNum ] * formResult.scale;

			if ( formResult.mirror[ formResult.orientation[ j ] ] ) {o[j] *= -1;}
			
			}
		
		let _vert = _cube.getGlobalVertexPositions();
		let _cubemesh = _cube.getMesh();

		//Faces
		faces.forEach(face => {
			
			let _face 	= _cube.faces[face];
			let vid 	= _face.getVertexIndices();
			
			let _tex 	= _face.getTexture();
			let _tex_w 	= _tex.uv_width ?? Project.texture_width;
			let _tex_h 	= _tex.uv_height ?? Project.texture_height;

			let v = [
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0],
				[0, 0, 0]
				];

			for(var j = 0; j < 3; j++) {

				let _axisNum = getAxisNumber( formResult.orientation[ j ] ) ;

				v[0][j] = _vert[ vid[0] ][ _axisNum ] * formResult.scale;
				v[1][j] = _vert[ vid[1] ][ _axisNum ] * formResult.scale;
				v[2][j] = _vert[ vid[2] ][ _axisNum ] * formResult.scale;
				v[3][j] = _vert[ vid[3] ][ _axisNum ] * formResult.scale;
				

				if ( formResult.mirror[ formResult.orientation[ j ] ] ) {

					v[0][j] *= -1;
					v[1][j] *= -1;
					v[2][j] *= -1;
					v[3][j] *= -1;
					
					}
				
				}

			let m = new THREE.Matrix4();
			m.set(
				v[0][0], v[0][1], v[0][2], 1,
				v[1][0], v[1][1], v[1][2], 1,
				v[2][0], v[2][1], v[2][2], 1,
				o[0], o[1], o[2], 1
				);
			let _det = m.determinant();
			let _dir = (_det != 0) ? Math.sign(_det) : 1;
			
			//#region getNormal

			let edge1 	= [ ...v[2] ].V3_subtract( v[0] ).V3_toThree();
			let edge2 	= [ ...v[1] ].V3_subtract( v[0] ).V3_toThree();
			let n 		= new THREE.Vector3().crossVectors(edge2, edge1).multiplyScalar(_dir).normalize().toArray();

			//#endregion

			//#region UVs

			let uv = [
				[_face.uv[0] / _tex_w, _face.uv[1] / _tex_h ],
				[_face.uv[2] / _tex_w, _face.uv[1] / _tex_h ],
				[_face.uv[2] / _tex_w, _face.uv[3] / _tex_h ],
				[_face.uv[0] / _tex_w, _face.uv[3] / _tex_h ]
				];
			
			//#endregion

			//Color
			var c = (formResult.marker_colors != "none") ? hex_string_to_rgb( markerColors[_cube.color][formResult.marker_colors] ) : [255, 255, 255];
			
			//Bone Index
			let bidx = bone_get_index(_export, _parent);
			
			for (let j = 0, k = 0; k < 6; k++) {
				vertex_add_point(_export, v[j], n, uv[j], c[0], c[1], c[2], 255, bidx);
				if ((k % 3) != 2 ) {j = ( (j + _dir) % 4);}
				if (j < 0) {j = 4 + j;}
				}

			} );
		
		if (formResult.split_meshes) {submesh_close(_export); submesh_open(_export);}

		}
	
	for (let i = 0; i < Mesh.all.length; i++) {

		let _mesh = Mesh.all[i];
		let _parent = _mesh.parent;

		if ( (!_mesh.export) || (formResult.only_visible && !_mesh.visibility) ) continue;

		let o = [0, 0, 0];
		for(var j = 0; j < 3; j++) {

			let _axisNum = getAxisNumber( formResult.orientation[j] ) ;
			o[j] = _mesh.origin[ _axisNum ] * formResult.scale;

			if ( formResult.mirror[ formResult.orientation[ j ] ] ) {o[j] *= -1;}
			
			}

		_mesh.forAllFaces(_face => {
			
			let vid = _face.getSortedVertices();
			
			let _tex = _face.getTexture();
			let _tex_w = _tex.uv_width ?? Project.texture_width;
			let _tex_h = _tex.uv_height ?? Project.texture_height;

			//Setup to determine new winding;
			
			let tmp_v = [
				[ ..._mesh.vertices[ vid[0] ] ],
				[ ..._mesh.vertices[ vid[1] ] ],
				[ ..._mesh.vertices[ vid[2] ] ]
				];

			for(var j = 0; j < 3; j++) {

				let _axisNum = getAxisNumber( formResult.orientation[ j ] ) ;

				tmp_v[0][j] = _mesh.vertices[ vid[0] ][ _axisNum ];
				tmp_v[1][j] = _mesh.vertices[ vid[1] ][ _axisNum ];
				tmp_v[2][j] = _mesh.vertices[ vid[2] ][ _axisNum ];

				if ( formResult.mirror[ formResult.orientation[ j ] ] ) {

					tmp_v[0][j] *= -1;
					tmp_v[1][j] *= -1;
					tmp_v[2][j] *= -1;
					
					}
				
				}

			let m = new THREE.Matrix4();
			m.set(
				...tmp_v[0], 1,
				...tmp_v[1], 1,
				...tmp_v[2], 1,
				...o, 1
				);
			let _det = m.determinant();
			let _dir = (_det < 0) ? -1 : 1;
			/* */

			//Perform calculations for the first vertex and the normal.
			let v = [
				[ ..._mesh.vertices[ vid[0] ] ],
				[ 0, 0, 0],
				[ 0, 0, 0]
				];
			let n = [];

			for(var k = 0; k < 3; k++) {

				let _axisNum = getAxisNumber( formResult.orientation[ k ] ) ;

				v[0][k] = (_mesh.vertices[ vid[0] ][ _axisNum ] + _mesh.origin[_axisNum] ) * formResult.scale;
				n[k] = _face.getNormal(true)[_axisNum];

				if ( formResult.mirror[ formResult.orientation[ k ] ] ) {
					v[0][k] *= -1;
					n[k] *= -1;
					}
				
				}

			let uv0 = [
				(isNaN(_face.uv[ vid[0] ][0]) ? 0 : _face.uv[ vid[0] ][0]) / _tex_w,
				(isNaN(_face.uv[ vid[0] ][1]) ? 0 : _face.uv[ vid[0] ][1]) / _tex_h,
				];

			let _vert_count = _face.vertices.length;
			for (let _a = 1, j = ( (_dir < 0) ? _vert_count : 0); (_a + 1) < _vert_count ; _a++) {
				j += _dir;

				for(var k = 0; k < 3; k++) {

					let _axisNum = getAxisNumber( formResult.orientation[ k ] ) ;

					v[1][k] = (_mesh.vertices[ vid[j] ][ _axisNum ] + _mesh.origin[_axisNum] ) * formResult.scale;
					v[2][k] = (_mesh.vertices[ vid[j+_dir] ][ _axisNum ] + _mesh.origin[_axisNum] ) * formResult.scale;

					if ( formResult.mirror[ formResult.orientation[ k ] ] ) {

						v[1][k] *= -1;
						v[2][k] *= -1;
						
						}
					
					}

				//#region getNormal

				//let edge1 	= [...v[1] ].V3_subtract(v[0]).V3_toThree();
				//let edge2 	= [...v[2] ].V3_subtract(v[0]).V3_toThree();

				//#endregion
				
				//#region Texcoord

				let uv1 = [
					(isNaN(_face.uv[ vid[j] ][0]) ? 0 : _face.uv[ vid[j] ][0]) / _tex_w,
					(isNaN(_face.uv[ vid[j] ][1]) ? 0 : _face.uv[ vid[j] ][1]) / _tex_h,
					];
				let uv2 = [
					(isNaN(_face.uv[ vid[j+_dir] ][0]) ? 0 : _face.uv[ vid[j+_dir] ][0]) / _tex_w,
					(isNaN(_face.uv[ vid[j+_dir] ][1]) ? 0 : _face.uv[ vid[j+_dir] ][1]) / _tex_h,
					];
				
				//#endregion
				
				//Color
				let c = (formResult.marker_colors != "none") ? hex_string_to_rgb( markerColors[_mesh.color][formResult.marker_colors] ) : [255, 255, 255];
				
				//Bone Index
				let bidx = bone_get_index(_export, _parent);

				vertex_add_point(_export, v[0], n, uv0, c[0], c[1], c[2], 255, bidx);
				vertex_add_point(_export, v[1], n, uv1, c[0], c[1], c[2], 255, bidx);
				vertex_add_point(_export, v[2], n, uv2, c[0], c[1], c[2], 255, bidx);
				
				}

			} );

		}

	submesh_close(_export)
	
	if (isApp) {
		
		switch( formResult.filetype ) {
			
			case "legacy": 

				_export.d3d_str = `100\n${_export.d3d_entries}\n` + _export.d3d_str;

				Blockbench.export({
						type: 'GameMaker Model',
						extensions: ['d3d', 'gmmod'],
						name: (Project.name !== '' ? Project.name: "model"),
						content: _export.d3d_str,
						savetype: 'text'
						},
					);
				
				
				break;

			case "vBuff": 

				Blockbench.export({
					type: 'GameMaker Model',
					extensions: ['vbuff'],
					name: (Project.name !== '' ? Project.name: "model"),
					content: _export.buffer,
					savetype: 'text'
					});
				
				
				break;

			}

		
		} 
	
	}

function export_skeleton() {
	/* 
		Blockbench.export({
			type: 'JSON Rig',
			extensions: ['json'],
			name: (Project.name !== '' ? Project.name: "rig"),
			content: JSON.stringify(_export.boneData),
			savetype: 'text'
			});
		/* */
	}

function generate_gml() {}

function open_gml_dialog() {}

function submesh_open(d) {d.d3d_str += "0 4 0 0 0 0 0 0 0 0 0\n"; d.d3d_entries++;}
function submesh_close(d) {d.d3d_str += "1 0 0 0 0 0 0 0 0 0 0\n"; d.d3d_entries++;}

function vertex_add_point(d, pos, normal, uv, r, g, b, a, boneIdx) {

	d.d3d_str += "9 ";

	//#region Position 3D
	let v = [...pos];

	if ( formResult.normalize ) {
		v[0] /= d.magnitude;
		v[1] /= d.magnitude;
		v[2] /= d.magnitude;
		}

	d.offset = d.buffer.writeFloatLE(v[0], d.offset);
	d.offset = d.buffer.writeFloatLE(v[1], d.offset);
	d.offset = d.buffer.writeFloatLE(v[2], d.offset);

	d.d3d_str += `${v[0]} ${v[1]} ${v[2]} `;

	//#endregion

	//#region Normal

	d.offset = d.buffer.writeFloatLE(normal[0], d.offset);
	d.offset = d.buffer.writeFloatLE(normal[1], d.offset);
	d.offset = d.buffer.writeFloatLE(normal[2], d.offset);

	d.d3d_str += `${normal[0]} ${normal[1]} ${normal[2]} `;

	//#endregion

	//#region Texcoord

	d.offset = d.buffer.writeFloatLE(uv[0], d.offset);
	d.offset = d.buffer.writeFloatLE(uv[1], d.offset);

	d.d3d_str += `${uv[0]} ${uv[1]} `;

	//#endregion

	
	//#region Color RGBA

	let _r = r, 
		_g = g, 
		_b = b,
		_a = a / 255;


	if (formResult.vformat.color) {

		if (formResult.normal_map) {
			_r = Math.round( (normal[0] * 0.5 + 0.5) * 255);
			_g = Math.round( (normal[1] * 0.5 + 0.5) * 255);
			_b = Math.round( (normal[2] * 0.5 + 0.5) * 255);
			}

		//Buffer
		d.offset = d.buffer.writeUInt8(_r, d.offset);
		d.offset = d.buffer.writeUInt8(_g, d.offset);
		d.offset = d.buffer.writeUInt8(_b, d.offset);
		d.offset = d.buffer.writeUInt8(_a * 255, d.offset);
		}

	d.d3d_str += `${ _r | (_g << 8 ) | (_b << 16) } ${_a} `;

	//#endregion

	d.d3d_str += "\n";

	d.d3d_entries++;

	if ( formResult.vformat.boneindex ) {d.offset = d.buffer.writeFloatLE( boneIdx , d.offset );}

	}

function bone_add(d, _bone) {

	let _boneData = d.boneData;

	_boneData.map[ _bone.name ] = _boneData.Count;
	_boneData.name[_boneData.Count] = _bone.name;
	_boneData.parent[_boneData.Count] = (_bone.parent != "root") ? _boneData.map[_bone.parent.name] : -1;

	//Reorient Origin
	let _origin = [0, 0, 0];
	let _rotation = [0, 0, 0];

	for(var i = 0; i < 3; i++) {

		_origin[i] = _bone.origin[ getAxisNumber( formResult.orientation[i] ) ] * formResult.scale;
		_rotation[i] = _bone.rotation[ getAxisNumber( formResult.orientation[i] ) ];

		if ( formResult.mirror[ formResult.orientation[ i ] ] ) {_origin[i] *= -1;}
		}

	_boneData.x[_boneData.Count] = _origin[0];
	_boneData.y[_boneData.Count] = _origin[1];
	_boneData.z[_boneData.Count] = _origin[2];

	if (formResult.normalize) {
		_boneData.x[_boneData.Count] /= d.magnitude;
		_boneData.y[_boneData.Count] /= d.magnitude;
		_boneData.z[_boneData.Count] /= d.magnitude;
		}

	_boneData.xrotation[_boneData.Count] = _rotation[0];
	_boneData.yrotation[_boneData.Count] = _rotation[1];
	_boneData.zrotation[_boneData.Count] = _rotation[2];

	_boneData.Count += 1;
	}

function bone_get_index(d, _boneParent) {return (_boneParent != "root") ? d.boneData.map[ _boneParent.name ] : -1;}

function vertex_find_data() {
	//This finds the byteLength for the Buffer used for Vertex Buffer export.
	var stride = 12; //Bytesize of a "vertex" in the "vertex buffer" Position adds 12 by default

	if (formResult.vformat.normal) {stride += 12;}
	if (formResult.vformat.texcoord) {stride += 8;}
	if (formResult.vformat.color) {stride += 4;}
	if (formResult.vformat.boneindex) {stride += 4;}

	var _entries = 0;
	//Cube Data Size
	for (let i = 0; i < Cube.all.length; i++) {
		//if (!Cube.all[i].export || (formResult.only_visible && !Cube.all[i].visibility) ) continue;
		_entries += 36; //36 = (faceCount * vertsPerFace)
		}
	
	//Mesh Data Size
	for (let i = 0; i < Mesh.all.length; i++) {
		//if (!Mesh.all[i].export || (formResult.only_visible && !Mesh.all[i].visibility) ) continue;
		Mesh.all[i].forAllFaces(_face => {_entries += (_face.vertices.length - 2) * 3;} );
		}

	return {
		byteLength: _entries * stride,
		};
	}

function hex_string_to_rgb(hex) {
	return [
		parseInt(hex.substring(1, 3), 16),
		parseInt(hex.substring(3, 5), 16),
		parseInt(hex.substring(5, 7), 16)
		];
	}

///<reference types="C:\Users\Kevin\node_modules\blockbench-types\types"/>

(function() {

	//I know this could/should be cleaned up but it should work and there's no sense in breaking it just to seem more competent.
	
	//Dialog
	var exportDialog;

	var formResult;

	//Action
	let openDialog;

	//Plugin
	BBPlugin.register('gamemaker_export', {
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
					only_visible: {label: "Only Visible", type: "checkbox", value: true,},
					filetype: {label: "Data Type", type: "select", value: "vBuff",
						options: {legacy: "Legacy (D3D, GMMOD)", vBuff: "Vertex Buffer", mBuff: "Model Buffer"},
						description: "",
						},
					normalize: {label: "Normalize Positions", type: "checkbox",},
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
						options: {normal: "Normal", texcoord: "Texcoord", color: "Color"},
						default: {normal: true, texcoord: true, color: true},
						},
					marker_colors: {label: "Marker Color", type: "inline_select",
						options: {none: "None", standard: "Standard", pastel: "Pastel"},
						},
					include: {label: "Include", type: 'inline_multi_select', condition: ({filetype}) => ['mBuff'].includes(filetype),
						options: {bone_data: "BoneData", vformat: "Vertex Format",},
						default: {bone_data: true, vformat: false},
						},
					split_meshes: {label: "Split Meshes", type: "checkbox", condition: ({filetype}) => ['legacy'].includes(filetype)},
					export_textures: {label: "Export Textures", type: "checkbox"},
					},
				onOpen(){},
				onFormChange(_result) {},
				onConfirm(_result) {
					formResult = _result;
					GMmodel_build_and_export();
					}
				});
			
			openDialog = new Action("openGameMakerExportDialog",{
				name: "Export GameMaker Model",
				icon: "park",
				click: function() {exportDialog.show();}
				})
			
			MenuBar.addAction(openDialog, "file.export");
			},
		onunload() {
			console.log("Plugin Unloaded");

			openDialog.delete();
			exportDialog.delete();

			}

		});

	function GMmodel_build_and_export() {

		let vdata = vertex_find_data();
	
		//Export Data
		var _export = {
			d3d_str: "",
			d3d_entries: 0,

			boneCount: 0,
			
			buffer: Buffer.alloc( vdata.byteLength ),
			offset: 0,
			};
		
		submesh_open(_export);
		if (formResult.include_bone_data) {

			if (Group.hasAny() ) {

				var _boneCount = 0;
				var _boneData = [];
				var _boneIndex = {};
				let _bone, _origin = [0, 0, 0];

				for (let i = 0; i < Group.all.length; i++) {
					
					_bone = Group.all[i];

					_boneIndex[_bone.uuid] = i;

					for(var l = 0; l < 3; l++) {

						let _axisNum = getAxisNumber( formResult.orientation[j] ) ;
						_origin[j] = _bone.origin[ _axisNum ] * formResult.scale;
		
						if ( formResult.mirror[ formResult.orientation[ j ] ] ) {o[j] *= -1;}
						
						}

					_export.offset = _export.buffer.writeFloatLE(_origin[0], _export.offset);
					_export.offset = _export.buffer.writeFloatLE(_origin[1], _export.offset);
					_export.offset = _export.buffer.writeFloatLE(_origin[2], _export.offset);

					if (_bone.parent != "root") {_export.offset = _export.buffer.writeUInt8(0xFF, _export.offset);}
					else {_export.offset = _export.buffer.writeUInt8(_boneIndex[_bone.parent.uuid], _export.offset);}

					_boneCount += 1;
					}

				}

			if (Locator.hasAny() ) {
				
				for (let i = 0; i < Locator.all.length; i++) {
					
					_bone = Locator.all[i];

					_boneIndex[_bone.uuid] = i;

					}

				}

			}
		
		var _vertCount = 0;

		for (let i = 0; i < Cube.all.length; i++) {
			let _cube = Cube.all[i];
			
			if ( (!_cube.export) || (formResult.only_visible && !_cube.visibility) ) continue;

			let faces 	= ["north", "east", "south", "west", "up", "down"];
			
			let _vert = _cube.getGlobalVertexPositions();

			let o = [0, 0, 0];
			for(var j = 0; j < 3; j++) {

				let _axisNum = getAxisNumber( formResult.orientation[j] ) ;
				o[j] = _cube.origin[ _axisNum ] * formResult.scale;

				if ( formResult.mirror[ formResult.orientation[ j ] ] ) {o[j] *= -1;}
				
				}
			
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
				
				for (let j = 0, k = 0; k < 6; k++) {
					vertex_add_point(_export, v[j], n, uv[j], c[0], c[1], c[2], 255);
					if ((k % 3) != 2 ) {j = ( (j + _dir) % 4);}
					if (j < 0) {j = 4 + j;}
					}

				} );
			
			if (formResult.split_meshes) {submesh_close(_export); submesh_open(_export);}

			}
		
		for (let i = 0; i < Mesh.all.length; i++) {

			let _mesh = Mesh.all[i];
			if ( (!_mesh.export) || (formResult.only_visible && !_mesh.visibility) ) continue;

			let tmp_o = [..._mesh.origin].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray()
			let o = [0, 0, 0];

			for(var j = 0; j < 3; j++) {

				let _axisNum = getAxisNumber( formResult.orientation[j] ) ;
				o[j] = tmp_o[ _axisNum ] * formResult.scale;

				if ( formResult.mirror[ formResult.orientation[ j ] ] ) {o[j] *= -1;}
				
				}

			_mesh.forAllFaces(_face => {
				
				let vid = _face.getSortedVertices();
				
				let _tex = _face.getTexture();
				let _tex_w = _tex.uv_width ?? Project.texture_width;
				let _tex_h = _tex.uv_height ?? Project.texture_height;

				//Setup to determine new winding;
				let tmp_v = [
					[ ..._mesh.vertices[ vid[0] ] ].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray(),
					[ ..._mesh.vertices[ vid[1] ] ].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray(),
					[ ..._mesh.vertices[ vid[2] ] ].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray()
					];

				for(var j = 0; j < 3; j++) {

					let _axisNum = getAxisNumber( formResult.orientation[ j ] ) ;

					tmp_v[0][j] = _mesh.vertices[ vid[0] ][ _axisNum ] * formResult.scale;
					tmp_v[1][j] = _mesh.vertices[ vid[1] ][ _axisNum ] * formResult.scale;
					tmp_v[2][j] = _mesh.vertices[ vid[2] ][ _axisNum ] * formResult.scale;

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
				
				let v = [
					[ ..._mesh.vertices[ vid[0] ] ],
					[ 0, 0, 0],
					[ 0, 0, 0]
					];
				v[0] = v[0].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray();

				let vc = [
					[...v[0]],
					[0, 0, 0],
					[0, 0, 0]
					];

				for(var k = 0; k < 3; k++) {

					let _axisNum = getAxisNumber( formResult.orientation[ k ] ) ;

					v[0][k] = vc[0][ _axisNum ] * formResult.scale;

					if ( formResult.mirror[ formResult.orientation[ k ] ] ) {
						v[0][k] *= -1;
						}
					
					}

				let uv0 = [
					(isNaN(_face.uv[ vid[0] ][0]) ? 0 : _face.uv[ vid[0] ][0]) / _tex_w,
					(isNaN(_face.uv[ vid[0] ][1]) ? 0 : _face.uv[ vid[0] ][1]) / _tex_h,
					];

				let _vert_count = _face.vertices.length;
				for (let _a = 1, j = (_dir < 0) ? _vert_count : 0; (_a + 1) < _vert_count ; _a++) {
					j += _dir;

					vc[1] = [ ..._mesh.vertices[ vid[j] ] ];
					vc[2] = [ ..._mesh.vertices[ vid[j+_dir] ] ];

					vc[1] = vc[1].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray();
					vc[2] = vc[2].V3_toThree().applyMatrix4( _mesh.mesh.matrixWorld ).toArray();

					for(var k = 0; k < 3; k++) {

						let _axisNum = getAxisNumber( formResult.orientation[ k ] ) ;
	
						v[1][k] = vc[1][ _axisNum ] * formResult.scale;
						v[2][k] = vc[2][ _axisNum ] * formResult.scale;
	
						if ( formResult.mirror[ formResult.orientation[ k ] ] ) {
	
							v[1][k] *= -1;
							v[2][k] *= -1;
							
							}
						
						}

					//#region getNormal

					let edge1 	= [...v[1] ].V3_subtract(v[0]).V3_toThree();
					let edge2 	= [...v[2] ].V3_subtract(v[0]).V3_toThree();
					let n 		= new THREE.Vector3().crossVectors(edge1, edge2).multiplyScalar(_dir).normalize().toArray();

					//#endregion

					let uv1 = [
						(isNaN(_face.uv[ vid[j] ][0]) ? 0 : _face.uv[ vid[j] ][0]) / _tex_w,
						(isNaN(_face.uv[ vid[j] ][1]) ? 0 : _face.uv[ vid[j] ][1]) / _tex_h,
						];
					let uv2 = [
						(isNaN(_face.uv[ vid[j+_dir] ][0]) ? 0 : _face.uv[ vid[j+_dir] ][0]) / _tex_w,
						(isNaN(_face.uv[ vid[j+_dir] ][1]) ? 0 : _face.uv[ vid[j+_dir] ][1]) / _tex_h,
						];
					
					var c = (formResult.marker_colors != "none") ? hex_string_to_rgb( markerColors[_mesh.color][formResult.marker_colors] ) : [255, 255, 255];
					
					vertex_add_point(_export, v[0], n, uv0, c[0], c[1], c[2], 255);
					vertex_add_point(_export, v[1], n, uv1, c[0], c[1], c[2], 255);
					vertex_add_point(_export, v[2], n, uv2, c[0], c[1], c[2], 255);
					
					}

				} );

			}

		submesh_close(_export)
		
		if (isApp) {
			
			switch( formResult.filetype ) {
				
				case "legacy": {

					_export.d3d_str = `100\n${_export.d3d_entries}\n` + _export.d3d_str;

					Blockbench.export({
							type: 'GameMaker Model',
							extensions: ['d3d', 'gmmod'],
							name: (Project.name !== '' ? Project.name: "model"),
							content: _export.d3d_str,
							savetype: 'text'
							},
						);
					
					}
					break;

				case "vBuff": {

					Blockbench.export({
						type: 'GameMaker Model',
						extensions: ['vbuff'],
						name: (Project.name !== '' ? Project.name: "model"),
						content: _export.buffer,
						savetype: 'text'
						});
					
					}
					break;

				case "mBuff": {}
					break;
				}
			
			} 
		
		}

	function submesh_open(d) {d.d3d_str += "0 4 0 0 0 0 0 0 0 0 0\n"; d.d3d_entries++;}
	function submesh_close(d) {d.d3d_str += "1 0 0 0 0 0 0 0 0 0 0\n"; d.d3d_entries++;}

	function bone_add(d, parent_index, pos, ) {}

	function vertex_add_point(d, pos, normal, uv, r, g, b, a) {

		d.d3d_str += "9 ";

		//#region Position 3D

		d.offset = d.buffer.writeFloatLE(pos[0], d.offset);
		d.offset = d.buffer.writeFloatLE(pos[1], d.offset);
		d.offset = d.buffer.writeFloatLE(pos[2], d.offset);

		d.d3d_str += `${pos[0]} ${pos[1]} ${pos[2]} `;

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

		if (formResult.vformat[ "color"] ) {

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

		//offset = vBuff.writeFloatLE(index, offset);
		}

	function vertex_find_data() {
		//This only has a use find the byteLength for the Buffer used for Vertex Buffer export.
		var stride = 36; //Bytesize of a "vertex" in the "vertex buffer"
		var _entries = 0;


		//Cube Data Size
		for (let i = 0; i < Cube.all.length; i++) {
			if (!Cube.all[i].export || (formResult.only_visible && !Cube.all[i].visibility) ) continue;
			_entries += 36; //36 = (faceCount * vertsPerFace)
			}
		
		//Mesh Data Size
		for (let i = 0; i < Mesh.all.length; i++) {

			if (!Mesh.all[i].export || (formResult.only_visible && !Mesh.all[i].visibility) ) continue;

			Mesh.all[i].forAllFaces(_face => {
				
				//_count += tricount * 3;
				//tricount = polyvertcount - 2;
				//buffervertcount = tricount * 3;
				
				_entries += (_face.vertices.length - 2) * 3;

				//for (let j = 0; j < _face.vertices.length; j++) {_vlist.safePush(_face.vertices[j]);}

				} );
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

	})();
Allows Blockbench export to (unofficial) GameMaker models. (Only supports Triangle Lists)


There are no official 3D model formats for GameMaker at this time but these are some that should be simpler to load in your project.

## Vertex Buffer (.vbuff)

Exports a .vbuff file that can be simply loaded.


    var buffer = buffer_load("filename");
    var vbuff = vertex_create_buffer_from_buffer(buffer)

## Legacy - D3D/GMMOD

A plain text format of instructions for buiding the model with d3d functions. You would only use this for pre-Studio versions of GameMaker.

Explained Here: https://yal.cc/gamemaker-gmmod-format

Note: I don't remember whether I've tested this but I imagine that it works.

# Planned Features
Ordered by priority
- Export Rig (Groups and Armatures) as JSON.
- Generate GML Button (Useful for primatives).
- Generate Vertex Format String
- Animation Export (maybe)
- "Split Meshes" for Vertex Buffer export.

# A Small Note
I am admittedly skeptical of the quality of this plugin. I don't have experience with Javascript or Typescript beyond working on this. But it also sees to work fine.

In the future, GameMaker (through GMRT) should support [glTF and other formats] https://gamemaker.io/en/blog/update-spring-2026. Until, and potentially beyond, that point, I hope that you find this useful.

I started out trying to figure out glTF but decided it was over my head. It's meant for and includes things I wasn't interested in. It simply felt bloated to me. I didn't feel like using an obj parser or making my own. I also didn't feel like making a custom obj format. Spitting out a vertex buffer felt like the most natural implementation.
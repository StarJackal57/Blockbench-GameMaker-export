# Blockbench-GameMaker-Export
 
Allows Blockbench export to (unofficial) GameMaker models. There are no fficial 3D model formats for GameMaker but these are some that should be simple to load.

.d3d / .gmmod - Game Maker 6 - GameMaker Studio: 1.4 (Legacy) 

A plain text format of instructions for buiding the model with d3d functions. (Only exports for pr_trianglelist)
Explained Here: https://yal.cc/gamemaker-gmmod-format

.vbuff - GameMaker (Modern)

This is simply a buffer saved to a file. Loading this should be as simple as using "buffer_load" and using "vertex_create_buffer_from_buffer" on that buffer.
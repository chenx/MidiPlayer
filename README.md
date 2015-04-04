# MidiPlayer
A javascript class to play MIDI music directly, without plugin.


By: X. Chen  
Created on: 4/1/2015  
Last Modified: 4/3/2015  
Github site: <a href="https://github.com/chenx/MidiPlayer">https://github.com/chenx/MidiPlayer</a>

Demo
-----

<a href="http://homecox.com/games/midi/">See demo here</a>.

Usage
-----

You just need to include <a href="https://github.com/chenx/MidiPlayer/tree/master/javascript">midi.min.js</a> (uncompressed version: <a href="https://github.com/chenx/MidiPlayer/blob/master/javascript/midi.js">midi.js</a>) in the head section of your html page:

    <script src="javascript/midi.min.js"></script>

An alternative is to include all the files from which midi.js was made (Of course, the first way is much better):

    <script src="javascript/midi/stream.js"></script>
    <script src="javascript/midi/midifile.js"></script>
    <script src="javascript/midi/replayer.js"></script>
    <script src="javascript/midi/synth.js"></script>
    <script src="javascript/midi/audio.js"></script>
    <script src="javascript/midi/vbscript.js"></script>
    <script src="javascript/midi/MidiPlayer.js"></script>

You also need to include da.swf in the same directory as your html file. This is needed by Safari and Opera.

For the rest, check the html source of the demo above. It's just a few lines of javascript.

Features
---------

* Can specify these in constructor parameter list: midi, target, loop, maxLoop, end_callback.
    - midi: MIDI file path.
    - target: Target html element that this MIDI player is attached to.
    - loop: Optinoal. Whether loop the play. Value is true/false, default is false.
    - maxLoop: Optional. max number of loops to play when loop is true. Negative or 0 means infinite. Default is 1.
    - end_callback: Optional. Callback function when MIDI ends.
      e.g., use this to reset target button value from "stop" back to "play".
* can specify a debug div, to display debug message: setDebugDiv(debug_div_id).
* Start/stop MIDI by: start(), stop().
* If a MIDI started play, call start() again will stop and then restart from beginning.

This depends on other 5 javascript files (audio.js, midifile.js, replayer.js, stream.js, synth.js) from [2][3], which is a demo of [1]. This is related to [4], which is a powerful tool to play MIDI in browser.

The disadvantage of [2][3] is that it does not have control over how a MIDI file is played: when clicking on the link the file will be started multiple times and sounds chaotic; and there is no loop feature. Both are well handled by MidiPlayer.js here.

Another midi player javascript is in [5], but it cannot play multiple MIDI files at the same time, cannot play a MIDI file automatically after loading the page, and has no loop feature. All are handled by MidiPlayer.js here.

It can be a good idea to add MIDI support to HTML5 Audio tag, because MIDI files have much smaller size than wav/mp3, and the sound effects are very rich.

To-Do
-----

IE support, like how [5] does.  


References
----------

[1] http://matt.west.co.tt/music/jasmid-midi-synthesis-with-javascript-and-html5-audio/  
[2] http://jsspeccy.zxdemo.org/jasmid/  
[3] https://github.com/gasman/jasmid  
[4] MIDI.js - Sequencing in Javascript.  
[5] MIDI.js - The 100% JavaScript MIDI Player using W3C Web Audio  
[6] Dynamically generating MIDI in JavaScript  


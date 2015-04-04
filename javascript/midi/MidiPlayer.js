/**
 * MidiPlayer class. Used to play midi by javascript, without any plugin.
 * Requires a HTML5 browser: firefox, chrome, safari, opera, IE10+.
 *
 * The other 5 js files are from [2], which is a demo of [1]: 
 * [1] http://matt.west.co.tt/music/jasmid-midi-synthesis-with-javascript-and-html5-audio/
 * [2] http://jsspeccy.zxdemo.org/jasmid/
 *
 * Modification is done to audio.js:
 * - added function fireEventEnded().
 * - added 'ended' event firing when generator.finished is true.
 * - move 'context' outside function AudioPlayer, so in chrome it won't have this error
 *   when you loop the play:
 *   Failed to construct 'AudioContext': number of hardware contexts reached maximum (6)
 *
 * @by: X. Chen
 * @Create on: 4/1/2015
 * @Last modified: 4/3/2015
 */

if (typeof (MidiPlayer) == 'undefined') {

    /**
     * Constructor of MidiPlayer class.
     * @param midi    MIDI file path.
     * @param target  Target html element that this MIDI player is attached to.
     * @param loop    Optinoal. Whether loop the play. Value is true/false, default is false.
     * @param maxLoop Optional. max number of loops to play when loop is true. 
     *                Negative or 0 means infinite. Default is 1.
     * @param end_callback Optional. Callback function when MIDI ends.
     * @author X. Chen. April 2015.
     */
    var MidiPlayer = function(midi, target, loop, maxLoop, end_callback) {
        this.midi = midi;
        this.target = document.getElementById(target);
        this.loop = (typeof (loop) == 'undefined') ? false : loop;

        if (! loop) { 
            this.max_loop_ct = 1; 
        } else {
            this.max_loop_ct = (typeof (maxLoop) == 'undefined') ? 1 : (maxLoop <= 0 ? 0 : maxLoop);
        }

        this.end_callback = (typeof (end_callback) == 'function') ? end_callback : null;

        this.debug_div = null;
        this.midiFile = null;
        this.synth = null;
        this.replayer = null;
        this.audio = null;
        this.ct = 0;          // loop counter.
        this.started = false; // state of play: started/stopped.
        this.listener_added = false;
    }

    MidiPlayer.prototype.setDebugDiv = function(debug_div_id) {
        this.debug_div = (typeof (debug_div_id) == 'undefined') ?
                         null : document.getElementById(debug_div_id);
    }

    MidiPlayer.prototype.debug = function(msg) {
        if (this.debug_div) {
            this.debug_div.innerHTML += msg + '<br/>';
        }
    }

    MidiPlayer.prototype.stop = function() {
        this.started = false;
        this.ct = 0;
        if (this.audio) { 
            this.audio.stop(); 
            this.audio = null;
        }
        if (this.max_loop_ct > 0) {
            if (this.end_callback) { this.end_callback(); }
        }
    }

    MidiPlayer.prototype.play = function() {
        if (this.started) {
            this.stop();
            //return;
        }

        this.started = true;
        var o = this.target;

        var _this = this; // must be 'var', otherwise _this is public, and causes problem.
        var file = this.midi;
        var loop = this.loop;

        if (window.addEventListener) {
            // Should not add more than one listener after first call, otherwise o has more
            // and more listeners attached, and will fire n events the n-th time calling play.
            if (! this.listener_added) {
                this.listener_added = true;
                o.addEventListener('ended', function() { // addEventListener not work for IE8.
                    //alert('ended');
                    if (_this.max_loop_ct <= 0 || (++ _this.ct) < _this.max_loop_ct) {
                        _this.replayer = Replayer(_this.midiFile, _this.synth);
                        _this.audio = AudioPlayer(_this.replayer, o, loop);
                        _this.debug( file + ': loop ' + (1 +_this.ct) );
                    }
                    else if (_this.max_loop_ct > 0) {
                        _this.stop();
                    }
                }, false);
             }
         } else if (window.attachEvent) { // IE don't work anyway.
             //document.getElementById('music').attachEvent(
             //    'onclick', function(e) { alert('IE end'); }, true);
         }

         loadRemote(file, function(data) {
             if (_this.ct == 0) {
                 _this.midiFile = MidiFile(data);
                 _this.synth = Synth(44100);
             }
             _this.replayer = Replayer(_this.midiFile, _this.synth);
             _this.audio = AudioPlayer(_this.replayer, o, loop);
             _this.debug( file + ': loop ' + (1 + _this.ct) );
             //alert(_this.audio.type); // webkit for firefox, chrome; flash for opera/safari.
        });
    }


    // This function is modified from [2] by adding support for IE. See:
    // http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
    // https://code.google.com/p/jsdap/source/browse/trunk/?r=64
    //
    // However, IE8 and before do not support HTML5 Audio tag so this still will not work.
    // See: http://www.impressivewebs.com/html5-support-ie9/
    //
    // A private function, defined by 'var'. 
    // Original definition in [2] is: function loadRemote(path, callback) {
    var loadRemote = function(path, callback) {
        var fetch = new XMLHttpRequest();
        fetch.open('GET', path);

        if (fetch.overrideMimeType) {
            fetch.overrideMimeType("text/plain; charset=x-user-defined"); // for non-IE.
        }
        else {
            fetch.setRequestHeader('Accept-Charset', 'x-user-defined');   // for IE.
        }

        fetch.onreadystatechange = function() {
            if(this.readyState == 4 && this.status == 200) {
                // munge response into a binary string
                if (IE_HACK) { // for IE. 
                    var t = BinaryToArray(fetch.responseBody).toArray();
                    var ff = [];
                    var mx = t.length;
                    var scc= String.fromCharCode;
                    for (var z = 0; z < mx; z++) {
                        // t[z] here is equivalent to 't.charCodeAt(z) & 255' below.
                        // e.g., t[z] is 238, below t.charCodeAt[z] is 63470. 63470 & 255 = 238.
                        // But IE8 has no Audio element, so can't play anyway, 
                        // and will report this error in audio.js: 'Audio' is undefined.
                        ff[z] = scc(t[z]); 
                    }
                    callback(ff.join(""));
                } else {  // for non-IE.
                    var t = this.responseText || "" ;
                    var ff = [];
                    var mx = t.length;
                    var scc= String.fromCharCode;
                    for (var z = 0; z < mx; z++) {
                        ff[z] = scc(t.charCodeAt(z) & 255);
                    }
                    callback(ff.join(""));
                }
            }
        }
        fetch.send();
    }

}

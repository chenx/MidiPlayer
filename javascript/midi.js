//
// This software is released under the 3-clause BSD license.
//
// Copyright (c) 2015, Xin Chen <txchen@gmail.com>
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of the author nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
// WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
// DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER BE LIABLE FOR ANY
// DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
// LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
// ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
// SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//

/*******************************************************************************
 * 1) MidiPlayer.js.
 ******************************************************************************/

/**
 * MidiPlayer class. Used to play midi by javascript, without any plugin.
 * Requires a HTML5 browser: firefox, chrome, safari, opera, IE10+.
 *
 * The other 5 js files are from [2][3], which is a demo of [1]: 
 * [1] http://matt.west.co.tt/music/jasmid-midi-synthesis-with-javascript-and-html5-audio/
 * [2] http://jsspeccy.zxdemo.org/jasmid/
 * [3] https://github.com/gasman/jasmid 
 *
 * Modification is done to audio.js:
 * - added function fireEventEnded().
 * - added 'ended' event firing when generator.finished is true.
 * - move 'context' outside function AudioPlayer, so in chrome it won't have this error
 *   when you loop the play:
 *   Failed to construct 'AudioContext': number of hardware contexts reached maximum (6)
 *
 * Github site: https://github.com/chenx/MidiPlayer
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
                if (o) { // If o does not exist, don't add listener.
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

// Now expand definition of MidiPlayer to include the other 6 files below.
// So comment out the line below, and add the back curly bracket at the end of file.
//} // (previous) end of: if (typeof (MidiPlayer) == 'undefined')



/*******************************************************************************
 * 2) vbscript.js 
 ******************************************************************************/
/**
 * Convert binary string to array. 
 *
 * See:
 * [1] http://stackoverflow.com/questions/1919972/how-do-i-access-xhr-responsebody-for-binary-data-from-javascript-in-ie
 * [2] https://code.google.com/p/jsdap/source/browse/trunk/?r=64
 */

var IE_HACK = (/msie/i.test(navigator.userAgent) &&
               !/opera/i.test(navigator.userAgent));
if (IE_HACK) {
    //alert('IE hack');
    document.write('<script type="text/vbscript">\n\
    Function BinaryToArray(Binary)\n\
        Dim i\n\
        ReDim byteArray(LenB(Binary))\n\
        For i = 1 To LenB(Binary)\n\
            byteArray(i-1) = AscB(MidB(Binary, i, 1))\n\
        Next\n\
        BinaryToArray = byteArray\n\
    End Function\n\
</script>');
}


/*******************************************************************************
 * Files 3) to 7) below are by:
 * Matt Westcott <matt@west.co.tt> - @gasmanic - http://matt.west.co.tt/
 * See: 
 * - http://matt.west.co.tt/music/jasmid-midi-synthesis-with-javascript-and-html5-audio/
 * - http://jsspeccy.zxdemo.org/jasmid/
 * - https://github.com/gasman/jasmid
 ******************************************************************************/
 
/*******************************************************************************
 * 3) audio.js. 
 ******************************************************************************/

var sampleRate = 44100; /* hard-coded in Flash player */
var context = null // XC. 
// Note this may cause name conflict. So be careful of variable name "context".

//
// http://stackoverflow.com/questions/2856513/how-can-i-trigger-an-onchange-event-manually
// Added by XC.
//
function fireEventEnded(target) {
    if (! target) return;

    if (document.createEvent) {
        var evt = document.createEvent("HTMLEvents");
        evt.initEvent("ended", false, true);
        target.dispatchEvent(evt);
    }
    else if (document.createEventObject) {   // IE before version 9
        var myEvent = document.createEventObject();
        target.fireEvent('onclick', myEvent);
    }
}


//function AudioPlayer(generator, opts) {
function AudioPlayer(generator, targetElement, opts) {
    if (!opts) opts = {};
    var latency = opts.latency || 1;
    var checkInterval = latency * 100 /* in ms */
    
    var audioElement = new Audio();
    var webkitAudio = window.AudioContext || window.webkitAudioContext;
    var requestStop = false;

    if (audioElement.mozSetup) {
        audioElement.mozSetup(2, sampleRate); /* channels, sample rate */
        
        var buffer = []; /* data generated but not yet written */
        var minBufferLength = latency * 2 * sampleRate; /* refill buffer when there are only this many elements remaining */
        var bufferFillLength = Math.floor(latency * sampleRate);
        
        function checkBuffer() {
            if (requestStop) return; // no more data feed after request stop. xc.
            if (buffer.length) {
                var written = audioElement.mozWriteAudio(buffer);
                buffer = buffer.slice(written);
            }
            if (buffer.length < minBufferLength && !generator.finished) {
                buffer = buffer.concat(generator.generate(bufferFillLength));
            }
            if (!requestStop && (!generator.finished || buffer.length)) {
                setTimeout(checkBuffer, checkInterval);
            }
            if (!requestStop && generator.finished) {
                fireEventEnded(targetElement); // xc.
            }
        }
        checkBuffer();
        
        return {
            'type': 'Firefox Audio',
            'stop': function() {
                requestStop = true;
            }
        }
    } else if (webkitAudio) {
        // Uses Webkit Web Audio API if available
        
        // chrome stops after 5 invocation. XC. Error is:
        // Failed to construct 'AudioContext': number of hardware contexts reached maximum (6)
        //var context = new webkitAudio(); 
        if (! context) context = new webkitAudio(); // fixed by this. XC.
        sampleRate = context.sampleRate;
        
        var channelCount = 2;
        var bufferSize = 4096*4; // Higher for less gitches, lower for less latency
        
        var node = context.createScriptProcessor(bufferSize, 0, channelCount);
        
        node.onaudioprocess = function(e) { process(e) };

        function process(e) {
            if (generator.finished) {
                node.disconnect();
                //alert('done: ' + targetElement); // xc.
                fireEventEnded(targetElement); // xc.
                return;
            }
            
            var dataLeft = e.outputBuffer.getChannelData(0);
            var dataRight = e.outputBuffer.getChannelData(1);

            var generate = generator.generate(bufferSize);

            for (var i = 0; i < bufferSize; ++i) {
                dataLeft[i] = generate[i*2];
                dataRight[i] = generate[i*2+1];
            }
        }
        
        // start
        node.connect(context.destination);
        
        return {
            'stop': function() {
                // pause
                node.disconnect();
                requestStop = true;
            },
            'type': 'Webkit Audio'
        }

    } else {
        // Fall back to creating flash player
        var c = document.createElement('div');
        c.innerHTML = '<embed type="application/x-shockwave-flash" id="da-swf" src="da.swf" width="8" height="8" allowScriptAccess="always" style="position: fixed; left:-10px;" />';
        document.body.appendChild(c);
        var swf = document.getElementById('da-swf');
        
        var minBufferDuration = latency * 1000; /* refill buffer when there are only this many ms remaining */
        var bufferFillLength = latency * sampleRate;
        
        function write(data) {
            var out = new Array(data.length);
            for (var i = data.length-1; i != 0; i--) {
                out[i] = Math.floor(data[i]*32768);
            }
            return swf.write(out.join(' '));
        }
        
        function checkBuffer() {
            if (requestStop) return; // no more data feed after request stop. xc.
            if (swf.bufferedDuration() < minBufferDuration) {
                write(generator.generate(bufferFillLength));
            };
            if (!requestStop && !generator.finished) setTimeout(checkBuffer, checkInterval);
            if (!requestStop && generator.finished) fireEventEnded(targetElement); // xc.
        }
        
        function checkReady() {
            if (swf.write) {
                checkBuffer();
            } else {
                setTimeout(checkReady, 10);
            }
        }
        checkReady();
        
        return {
            'stop': function() {
                swf.stop();
                requestStop = true;
            },
            'bufferedDuration': function() {
                return swf.bufferedDuration();
            },
            'type': 'Flash Audio'
        }
    }
}


/*******************************************************************************
 * 4) midifile.js
 ******************************************************************************/
/**
 * Class to parse the .mid file format. Depends on stream.js.
 */

function MidiFile(data) {
    function readChunk(stream) {
        var id = stream.read(4);
        var length = stream.readInt32();
        return {
            'id': id,
            'length': length,
            'data': stream.read(length)
        };
    }
    
    var lastEventTypeByte;
    
    function readEvent(stream) {
        var event = {};
        event.deltaTime = stream.readVarInt();
        var eventTypeByte = stream.readInt8();
        if ((eventTypeByte & 0xf0) == 0xf0) {
            /* system / meta event */
            if (eventTypeByte == 0xff) {
                /* meta event */
                event.type = 'meta';
                var subtypeByte = stream.readInt8();
                var length = stream.readVarInt();
                switch(subtypeByte) {
                    case 0x00:
                        event.subtype = 'sequenceNumber';
                        if (length != 2) throw "Expected length for sequenceNumber event is 2, got " + length;
                        event.number = stream.readInt16();
                        return event;
                    case 0x01:
                        event.subtype = 'text';
                        event.text = stream.read(length);
                        return event;
                    case 0x02:
                        event.subtype = 'copyrightNotice';
                        event.text = stream.read(length);
                        return event;
                    case 0x03:
                        event.subtype = 'trackName';
                        event.text = stream.read(length);
                        return event;
                    case 0x04:
                        event.subtype = 'instrumentName';
                        event.text = stream.read(length);
                        return event;
                    case 0x05:
                        event.subtype = 'lyrics';
                        event.text = stream.read(length);
                        return event;
                    case 0x06:
                        event.subtype = 'marker';
                        event.text = stream.read(length);
                        return event;
                    case 0x07:
                        event.subtype = 'cuePoint';
                        event.text = stream.read(length);
                        return event;
                    case 0x20:
                        event.subtype = 'midiChannelPrefix';
                        if (length != 1) throw "Expected length for midiChannelPrefix event is 1, got " + length;
                        event.channel = stream.readInt8();
                        return event;
                    case 0x2f:
                        event.subtype = 'endOfTrack';
                        if (length != 0) throw "Expected length for endOfTrack event is 0, got " + length;
                        return event;
                    case 0x51:
                        event.subtype = 'setTempo';
                        if (length != 3) throw "Expected length for setTempo event is 3, got " + length;
                        event.microsecondsPerBeat = (
                            (stream.readInt8() << 16)
                            + (stream.readInt8() << 8)
                            + stream.readInt8()
                        )
                        return event;
                    case 0x54:
                        event.subtype = 'smpteOffset';
                        if (length != 5) throw "Expected length for smpteOffset event is 5, got " + length;
                        var hourByte = stream.readInt8();
                        event.frameRate = {
                            0x00: 24, 0x20: 25, 0x40: 29, 0x60: 30
                        }[hourByte & 0x60];
                        event.hour = hourByte & 0x1f;
                        event.min = stream.readInt8();
                        event.sec = stream.readInt8();
                        event.frame = stream.readInt8();
                        event.subframe = stream.readInt8();
                        return event;
                    case 0x58:
                        event.subtype = 'timeSignature';
                        if (length != 4) throw "Expected length for timeSignature event is 4, got " + length;
                        event.numerator = stream.readInt8();
                        event.denominator = Math.pow(2, stream.readInt8());
                        event.metronome = stream.readInt8();
                        event.thirtyseconds = stream.readInt8();
                        return event;
                    case 0x59:
                        event.subtype = 'keySignature';
                        if (length != 2) throw "Expected length for keySignature event is 2, got " + length;
                        event.key = stream.readInt8(true);
                        event.scale = stream.readInt8();
                        return event;
                    case 0x7f:
                        event.subtype = 'sequencerSpecific';
                        event.data = stream.read(length);
                        return event;
                    default:
                        // console.log("Unrecognised meta event subtype: " + subtypeByte);
                        event.subtype = 'unknown'
                        event.data = stream.read(length);
                        return event;
                }
                event.data = stream.read(length);
                return event;
            } else if (eventTypeByte == 0xf0) {
                event.type = 'sysEx';
                var length = stream.readVarInt();
                event.data = stream.read(length);
                return event;
            } else if (eventTypeByte == 0xf7) {
                event.type = 'dividedSysEx';
                var length = stream.readVarInt();
                event.data = stream.read(length);
                return event;
            } else {
                throw "Unrecognised MIDI event type byte: " + eventTypeByte;
            }
        } else {
            /* channel event */
            var param1;
            if ((eventTypeByte & 0x80) == 0) {
                /* running status - reuse lastEventTypeByte as the event type.
                    eventTypeByte is actually the first parameter
                */
                param1 = eventTypeByte;
                eventTypeByte = lastEventTypeByte;
            } else {
                param1 = stream.readInt8();
                lastEventTypeByte = eventTypeByte;
            }
            var eventType = eventTypeByte >> 4;
            event.channel = eventTypeByte & 0x0f;
            event.type = 'channel';
            switch (eventType) {
                case 0x08:
                    event.subtype = 'noteOff';
                    event.noteNumber = param1;
                    event.velocity = stream.readInt8();
                    return event;
                case 0x09:
                    event.noteNumber = param1;
                    event.velocity = stream.readInt8();
                    if (event.velocity == 0) {
                        event.subtype = 'noteOff';
                    } else {
                        event.subtype = 'noteOn';
                    }
                    return event;
                case 0x0a:
                    event.subtype = 'noteAftertouch';
                    event.noteNumber = param1;
                    event.amount = stream.readInt8();
                    return event;
                case 0x0b:
                    event.subtype = 'controller';
                    event.controllerType = param1;
                    event.value = stream.readInt8();
                    return event;
                case 0x0c:
                    event.subtype = 'programChange';
                    event.programNumber = param1;
                    return event;
                case 0x0d:
                    event.subtype = 'channelAftertouch';
                    event.amount = param1;
                    return event;
                case 0x0e:
                    event.subtype = 'pitchBend';
                    event.value = param1 + (stream.readInt8() << 7);
                    return event;
                default:
                    throw "Unrecognised MIDI event type: " + eventType
                    /* 
                    console.log("Unrecognised MIDI event type: " + eventType);
                    stream.readInt8();
                    event.subtype = 'unknown';
                    return event;
                    */
            }
        }
    }
    
    stream = Stream(data);
    var headerChunk = readChunk(stream);
    if (headerChunk.id != 'MThd' || headerChunk.length != 6) {
        throw "Bad .mid file - header not found";
    }
    var headerStream = Stream(headerChunk.data);
    var formatType = headerStream.readInt16();
    var trackCount = headerStream.readInt16();
    var timeDivision = headerStream.readInt16();
    
    if (timeDivision & 0x8000) {
        throw "Expressing time division in SMTPE frames is not supported yet"
    } else {
        ticksPerBeat = timeDivision;
    }
    
    var header = {
        'formatType': formatType,
        'trackCount': trackCount,
        'ticksPerBeat': ticksPerBeat
    }
    var tracks = [];
    for (var i = 0; i < header.trackCount; i++) {
        tracks[i] = [];
        var trackChunk = readChunk(stream);
        if (trackChunk.id != 'MTrk') {
            throw "Unexpected chunk - expected MTrk, got "+ trackChunk.id;
        }
        var trackStream = Stream(trackChunk.data);
        while (!trackStream.eof()) {
            var event = readEvent(trackStream);
            tracks[i].push(event);
            //console.log(event);
        }
    }
    
    return {
        'header': header,
        'tracks': tracks
    }
}


/*******************************************************************************
 * 5) replayer.js
 ******************************************************************************/

function Replayer(midiFile, synth) {
    var trackStates = [];
    var beatsPerMinute = 120;
    var ticksPerBeat = midiFile.header.ticksPerBeat;
    var channelCount = 16;
    
    for (var i = 0; i < midiFile.tracks.length; i++) {
        trackStates[i] = {
            'nextEventIndex': 0,
            'ticksToNextEvent': (
                midiFile.tracks[i].length ?
                    midiFile.tracks[i][0].deltaTime :
                    null
            )
        };
    }
    
    function Channel() {
        
        var generatorsByNote = {};
        var currentProgram = PianoProgram;
        
        function noteOn(note, velocity) {
            if (generatorsByNote[note] && !generatorsByNote[note].released) {
                /* playing same note before releasing the last one. BOO */
                generatorsByNote[note].noteOff(); /* TODO: check whether we ought to be passing a velocity in */
            }
            generator = currentProgram.createNote(note, velocity);
            synth.addGenerator(generator);
            generatorsByNote[note] = generator;
        }
        function noteOff(note, velocity) {
            if (generatorsByNote[note] && !generatorsByNote[note].released) {
                generatorsByNote[note].noteOff(velocity);
            }
        }
        function setProgram(programNumber) {
            currentProgram = PROGRAMS[programNumber] || PianoProgram;
        }
        
        return {
            'noteOn': noteOn,
            'noteOff': noteOff,
            'setProgram': setProgram
        }
    }
    
    var channels = [];
    for (var i = 0; i < channelCount; i++) {
        channels[i] = Channel();
    }
    
    var nextEventInfo;
    var samplesToNextEvent = 0;
    
    function getNextEvent() {
        var ticksToNextEvent = null;
        var nextEventTrack = null;
        var nextEventIndex = null;
        
        for (var i = 0; i < trackStates.length; i++) {
            if (
                trackStates[i].ticksToNextEvent != null
                && (ticksToNextEvent == null || trackStates[i].ticksToNextEvent < ticksToNextEvent)
            ) {
                ticksToNextEvent = trackStates[i].ticksToNextEvent;
                nextEventTrack = i;
                nextEventIndex = trackStates[i].nextEventIndex;
            }
        }
        if (nextEventTrack != null) {
            /* consume event from that track */
            var nextEvent = midiFile.tracks[nextEventTrack][nextEventIndex];
            if (midiFile.tracks[nextEventTrack][nextEventIndex + 1]) {
                trackStates[nextEventTrack].ticksToNextEvent += midiFile.tracks[nextEventTrack][nextEventIndex + 1].deltaTime;
            } else {
                trackStates[nextEventTrack].ticksToNextEvent = null;
            }
            trackStates[nextEventTrack].nextEventIndex += 1;
            /* advance timings on all tracks by ticksToNextEvent */
            for (var i = 0; i < trackStates.length; i++) {
                if (trackStates[i].ticksToNextEvent != null) {
                    trackStates[i].ticksToNextEvent -= ticksToNextEvent
                }
            }
            nextEventInfo = {
                'ticksToEvent': ticksToNextEvent,
                'event': nextEvent,
                'track': nextEventTrack
            }
            var beatsToNextEvent = ticksToNextEvent / ticksPerBeat;
            var secondsToNextEvent = beatsToNextEvent / (beatsPerMinute / 60);
            samplesToNextEvent += secondsToNextEvent * synth.sampleRate;
        } else {
            nextEventInfo = null;
            samplesToNextEvent = null;
            self.finished = true;
        }
    }
    
    getNextEvent();
    
    function generate(samples) {
        var data = new Array(samples*2);
        var samplesRemaining = samples;
        var dataOffset = 0;
        
        while (true) {
            if (samplesToNextEvent != null && samplesToNextEvent <= samplesRemaining) {
                /* generate samplesToNextEvent samples, process event and repeat */
                var samplesToGenerate = Math.ceil(samplesToNextEvent);
                if (samplesToGenerate > 0) {
                    synth.generateIntoBuffer(samplesToGenerate, data, dataOffset);
                    dataOffset += samplesToGenerate * 2;
                    samplesRemaining -= samplesToGenerate;
                    samplesToNextEvent -= samplesToGenerate;
                }
                
                handleEvent();
                getNextEvent();
            } else {
                /* generate samples to end of buffer */
                if (samplesRemaining > 0) {
                    synth.generateIntoBuffer(samplesRemaining, data, dataOffset);
                    samplesToNextEvent -= samplesRemaining;
                }
                break;
            }
        }
        return data;
    }
    
    function handleEvent() {
        var event = nextEventInfo.event;
        switch (event.type) {
            case 'meta':
                switch (event.subtype) {
                    case 'setTempo':
                        beatsPerMinute = 60000000 / event.microsecondsPerBeat
                }
                break;
            case 'channel':
                switch (event.subtype) {
                    case 'noteOn':
                        channels[event.channel].noteOn(event.noteNumber, event.velocity);
                        break;
                    case 'noteOff':
                        channels[event.channel].noteOff(event.noteNumber, event.velocity);
                        break;
                    case 'programChange':
                        //console.log('program change to ' + event.programNumber);
                        channels[event.channel].setProgram(event.programNumber);
                        break;
                }
                break;
        }
    }
    
    function replay(audio) {
        console.log('replay');
        audio.write(generate(44100));
        setTimeout(function() {replay(audio)}, 10);
    }
    
    var self = {
        'replay': replay,
        'generate': generate,
        'finished': false
    }
    return self;
}


/*******************************************************************************
 * 6) stream.js
 ******************************************************************************/
/**
 * Wrapper for accessing strings through sequential reads.
 */

function Stream(str) {
    var position = 0;
    
    function read(length) {
        var result = str.substr(position, length);
        position += length;
        return result;
    }
    
    /* read a big-endian 32-bit integer */
    function readInt32() {
        var result = (
            (str.charCodeAt(position) << 24)
            + (str.charCodeAt(position + 1) << 16)
            + (str.charCodeAt(position + 2) << 8)
            + str.charCodeAt(position + 3));
        position += 4;
        return result;
    }

    /* read a big-endian 16-bit integer */
    function readInt16() {
        var result = (
            (str.charCodeAt(position) << 8)
            + str.charCodeAt(position + 1));
        position += 2;
        return result;
    }
    
    /* read an 8-bit integer */
    function readInt8(signed) {
        var result = str.charCodeAt(position);
        if (signed && result > 127) result -= 256;
        position += 1;
        return result;
    }
    
    function eof() {
        return position >= str.length;
    }
    
    /* read a MIDI-style variable-length integer
        (big-endian value in groups of 7 bits,
        with top bit set to signify that another byte follows)
    */
    function readVarInt() {
        var result = 0;
        while (true) {
            var b = readInt8();
            if (b & 0x80) {
                result += (b & 0x7f);
                result <<= 7;
            } else {
                /* b is the last byte */
                return result + b;
            }
        }
    }
    
    return {
        'eof': eof,
        'read': read,
        'readInt32': readInt32,
        'readInt16': readInt16,
        'readInt8': readInt8,
        'readVarInt': readVarInt
    }
}


/*******************************************************************************
 * 7) synth.js
 ******************************************************************************/

function SineGenerator(freq) {
    var self = {'alive': true};
    var period = sampleRate / freq;
    var t = 0;
    
    self.generate = function(buf, offset, count) {
        for (; count; count--) {
            var phase = t / period;
            var result = Math.sin(phase * 2 * Math.PI);
            buf[offset++] += result;
            buf[offset++] += result;
            t++;
        }
    }
    
    return self;
}

function SquareGenerator(freq, phase) {
    var self = {'alive': true};
    var period = sampleRate / freq;
    var t = 0;
    
    self.generate = function(buf, offset, count) {
        for (; count; count--) {
            var result = ( (t / period) % 1 > phase ? 1 : -1);
            buf[offset++] += result;
            buf[offset++] += result;
            t++;
        }
    }
    
    return self;
}

function ADSRGenerator(child, attackAmplitude, sustainAmplitude, attackTimeS, decayTimeS, releaseTimeS) {
    var self = {'alive': true}
    var attackTime = sampleRate * attackTimeS;
    var decayTime = sampleRate * (attackTimeS + decayTimeS);
    var decayRate = (attackAmplitude - sustainAmplitude) / (decayTime - attackTime);
    var releaseTime = null; /* not known yet */
    var endTime = null; /* not known yet */
    var releaseRate = sustainAmplitude / (sampleRate * releaseTimeS);
    var t = 0;
    
    self.noteOff = function() {
        if (self.released) return;
        releaseTime = t;
        self.released = true;
        endTime = releaseTime + sampleRate * releaseTimeS;
    }
    
    self.generate = function(buf, offset, count) {
        if (!self.alive) return;
        var input = new Array(count * 2);
        for (var i = 0; i < count*2; i++) {
            input[i] = 0;
        }
        child.generate(input, 0, count);
        
        childOffset = 0;
        while(count) {
            if (releaseTime != null) {
                if (t < endTime) {
                    /* release */
                    while(count && t < endTime) {
                        var ampl = sustainAmplitude - releaseRate * (t - releaseTime);
                        buf[offset++] += input[childOffset++] * ampl;
                        buf[offset++] += input[childOffset++] * ampl;
                        t++;
                        count--;
                    }
                } else {
                    /* dead */
                    self.alive = false;
                    return;
                }
            } else if (t < attackTime) {
                /* attack */
                while(count && t < attackTime) {
                    var ampl = attackAmplitude * t / attackTime;
                    buf[offset++] += input[childOffset++] * ampl;
                    buf[offset++] += input[childOffset++] * ampl;
                    t++;
                    count--;
                }
            } else if (t < decayTime) {
                /* decay */
                while(count && t < decayTime) {
                    var ampl = attackAmplitude - decayRate * (t - attackTime);
                    buf[offset++] += input[childOffset++] * ampl;
                    buf[offset++] += input[childOffset++] * ampl;
                    t++;
                    count--;
                }
            } else {
                /* sustain */
                while(count) {
                    buf[offset++] += input[childOffset++] * sustainAmplitude;
                    buf[offset++] += input[childOffset++] * sustainAmplitude;
                    t++;
                    count--;
                }
            }
        }
    }
    
    return self;
}

function midiToFrequency(note) {
    return 440 * Math.pow(2, (note-69)/12);
}

PianoProgram = {
    'attackAmplitude': 0.2,
    'sustainAmplitude': 0.1,
    'attackTime': 0.02,
    'decayTime': 0.3,
    'releaseTime': 0.02,
    'createNote': function(note, velocity) {
        var frequency = midiToFrequency(note);
        return ADSRGenerator(
            SineGenerator(frequency),
            this.attackAmplitude * (velocity / 128), this.sustainAmplitude * (velocity / 128),
            this.attackTime, this.decayTime, this.releaseTime
        );
    }
}

StringProgram = {
    'createNote': function(note, velocity) {
        var frequency = midiToFrequency(note);
        return ADSRGenerator(
            SineGenerator(frequency),
            0.5 * (velocity / 128), 0.2 * (velocity / 128),
            0.4, 0.8, 0.4
        );
    }
}

PROGRAMS = {
    41: StringProgram,
    42: StringProgram,
    43: StringProgram,
    44: StringProgram,
    45: StringProgram,
    46: StringProgram,
    47: StringProgram,
    49: StringProgram,
    50: StringProgram
};

function Synth(sampleRate) {
    
    var generators = [];
    
    function addGenerator(generator) {
        generators.push(generator);
    }
    
    function generate(samples) {
        var data = new Array(samples*2);
        generateIntoBuffer(samples, data, 0);
        return data;
    }
    
    function generateIntoBuffer(samplesToGenerate, buffer, offset) {
        for (var i = offset; i < offset + samplesToGenerate * 2; i++) {
            buffer[i] = 0;
        }
        for (var i = generators.length - 1; i >= 0; i--) {
            generators[i].generate(buffer, offset, samplesToGenerate);
            if (!generators[i].alive) generators.splice(i, 1);
        }
    }
    
    return {
        'sampleRate': sampleRate,
        'addGenerator': addGenerator,
        'generate': generate,
        'generateIntoBuffer': generateIntoBuffer
    }
}

} // end of: if (typeof (MidiPlayer) == 'undefined')

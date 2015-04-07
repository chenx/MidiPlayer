
var sampleRate = 44100; /* hard-coded in Flash player */
var context = null // XC. 
// Note this may cause name conflict. So be careful of variable name "context".

//
// http://stackoverflow.com/questions/2856513/how-can-i-trigger-an-onchange-event-manually
// Added by XC.
//
function fireEventEnded(target) {
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

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


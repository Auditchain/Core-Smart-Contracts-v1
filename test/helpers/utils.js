/* global assert */


Number.prototype.toFixedSpecial = function(n) {
    var str = this.toFixed(n);
    if (str.indexOf('e+') < 0)
        return str;

    // if number is in scientific notation, pick (b)ase and (p)ower
    return str.replace('.', '').split('e+').reduce(function(p, b) {
        return p + Array(b - p.length + 2).join(0);
    }) ;
}

function sums(arg1, arg2) {

    arg1 = arg1 + '';
    arg2 = arg2 + '';
	var sum = "";
	var r = 0;
	var a1, a2, i;

	// Pick the shortest string as first parameter and the longest as second parameter in my algorithm
	if (arg1.length < arg2.length) {
		a1 = arg1;
		a2 = arg2;
	}
	else {
		a1 = arg2;
		a2 = arg1;
	}
	a1 = a1.split("").reverse();
	a2 = a2.split("").reverse();

	// Sum a1 and a2 digits
	for (i = 0; i < a2.length; i++) {
		var t = ((i < a1.length) ? parseInt(a1[i]) : 0) + parseInt(a2[i]) + r;
		
		sum += t % 10;

		r = t < 10 ? 0 : Math.floor(t / 10);
	}
	// Append the last remain
	if (r > 0)
		sum += r;

	sum = sum.split("").reverse();
	
	// Trim the leading "0"
	while (sum[0] == "0")
		sum.shift();

	return sum.length > 0 ? sum.join("") : "0";
}


function isException(error) {

    if (error == undefined)
        error = ""; // handle cases when error hasn't happend but it should. 
    let strError = error.toString();
    return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert');
}



function ensureException(error) {
    assert.equal(isException(error), true);

}



function sums(arg1, arg2) {
	var sum = "";
	var r = 0;
	var a1, a2, i;

	// Pick the shortest string as first parameter and the longest as second parameter in my algorithm
	if (arg1.length < arg2.length) {
		a1 = arg1;
		a2 = arg2;
	}
	else {
		a1 = arg2;
		a2 = arg1;
	}
	a1 = a1.split("").reverse();
	a2 = a2.split("").reverse();

	// Sum a1 and a2 digits
	for (i = 0; i < a2.length; i++) {
		var t = ((i < a1.length) ? parseInt(a1[i]) : 0) + parseInt(a2[i]) + r;
		
		sum += t % 10;

		r = t < 10 ? 0 : Math.floor(t / 10);
	}
	// Append the last remain
	if (r > 0)
		sum += r;

	sum = sum.split("").reverse();
	
	// Trim the leading "0"
	while (sum[0] == "0")
		sum.shift();

	return sum.length > 0 ? sum.join("") : "0";
}

async function timeDifference(timestamp1, timestamp2) {
    var difference = timestamp1 - timestamp2;
    return difference;
}

function convertHex(hexx) {
    var hex = hexx.toString(); //force conversion
    var str = '';
    for (var i = 0; i < hex.length; i += 2) {
        let char = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        if (char != '\u0000') str += char;
    }
    return str;
}

export {
    ensureException,
    timeDifference,
    convertHex,    
    sums,
    Number
}

export const duration = {
    seconds: function (val) {
        return val;
    },
    minutes: function (val) {
        return val * this.seconds(60);
    },
    hours: function (val) {
        return val * this.minutes(60);
    },
    days: function (val) {
        return val * this.hours(24);
    },
    weeks: function (val) {
        return val * this.days(7);
    },
    years: function (val) {
        return val * this.days(365);
    },
};
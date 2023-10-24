let enabled = false

export function enable() {
	enabled = true
}

export function disable() {
	enabled = false
}

/**
 * returns new Boolean(true) if data does not match pattern
 * you can't return new Boolean(false), or at least that evaluates
 * to true, so if the data does match, it returns a primitive false
 * the Boolean(true) has an extra property called 'problems', which is
 * an array with a list of all fields that do not match, and why
 * @param  {any} data    The data to match
 * @param  {any} pattern The pattern to match
 * @return {Boolean(true)|false} True if the pattern fails, false
 */
export function fails(data, pattern) {
	let problems = []
	if (pattern instanceof RegExp) {
    	if (Array.isArray(data)) {
			let index = data.findIndex(element => fails(element,pattern))
            if (index>-1) {
            	problems.push('data['+index+'] does not match pattern')
            }
    	} else if (!pattern.test(data)) {
        	problems.push('data does not match pattern '+pattern)
        }
    } else if (pattern instanceof Function) {
        if (pattern(data)) {
        	problems.push('data does not match function')
        }
    } else if (pattern && typeof pattern == 'object') {
        if (Array.isArray(data)) {
            let index = data.findIndex(element => fails(element,pattern))
            if (index>-1) {
            	problems.push('data['+index+'] does not match pattern')
            }
        } else if (!data || typeof data != 'object') {
        	problems.push('data is not an object, pattern is')
        } else {
        	if (data instanceof URLSearchParams) {
        		data = Object.fromEntries(data)
        	}
	        let p = problems[problems.length-1]
	        for (const [wKey, wVal] of Object.entries(pattern)) {
	            let result = fails(data[wKey], wVal)
	            if (result) {
	            	if (!p || typeof p == 'string') {
	            		p = {}
	            		problems.push(p)
	            	}
	            	p[wKey] = result.problems
	            }
	        }
	    }
    } else {
    	if (pattern!=data) {
    		problems.push('data does not equal '+pattern)
    	}
    }
    if (problems.length) {
    	let result = new Boolean(true)
    	result.problems = problems
    	return result
    }
    return false
}

export function check(source, test) {
	if (!enabled) {
		return
	}
	let result = fails(source,test)
	if (result) {
		throw new assertError(result.problems)
	}
}

export function optional(pattern) {
	return function(data) {
		if (data==null || typeof data == 'undefined') {
			return false
		}
		return fails(data, pattern)
	}
}

class assertError {
	constructor(problems) {
		this.problems = problems
	}
}


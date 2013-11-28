/* 6.args.js
 *************************************/
(function(exports, fb) {
   var undefined;
   var util = fb.pkg('util');
   var log = fb.pkg('log');

   function Args(fnName ,args, minArgs, maxArgs) {
      if( typeof(fnName) !== 'string' ) { throw new Error('Args requires at least 2 args: fnName, arguments[, minArgs, maxArgs]')}
      if( !(this instanceof Args) ) { // allow it to be called without `new` prefix
         return new Args(fnName, args, minArgs, maxArgs);
      }
      this.fnName = fnName;
      this.argList = util.toArray(args);
      var len = this.argList.length;
      this.pos = -1;
      if( minArgs === undefined ) { minArgs = 0; }
      if( maxArgs === undefined ) { maxArgs = this.argList.length; }
      if( len < minArgs || len > maxArgs ) {
         var rangeText = maxArgs > minArgs? util.printf('%d to %d', minArgs, maxArgs) : minArgs;
         throw Error(util.printf('%s must be called with %s arguments, but received %d', fnName, rangeText, len));
      }
   }

   Args.prototype = {
      next: function(types, defaultValue) {
         return this._arg(types, defaultValue, false);
      },

      nextWarn: function(types, defaultValue) {
         return this._arg(types, defaultValue, 'warn');
      },

      nextReq: function(types) {
         return this._arg(types, null, true);
      },

      nextFrom: function(choices, defaultValue) {
         return this._from(choices, defaultValue, false);
      },

      nextFromWarn: function(choices, defaultValue) {
         return this._from(choices, defaultValue, 'warn');
      },

      nextFromReq: function(choices) {
         return this._from(choices, null, true);
      },

      listFrom: function(choices, defaultValue) {
         return this._list(choices, defaultValue, false);
      },

      listFromWarn: function(choices, defaultValue) {
         return this._list(choices, defaultValue, 'warn');
      },

      listFromReq: function(choices) {
         return this._list(choices, null, true);
      },

      restAsList: function() {
         return this.argList.slice(0);
      },

      _arg: function(types, defaultValue, required) {
         this.pos++;
         if( this.argList.length && isOfType(this.argList[0], types) ) {
            return format(this.argList.shift(), types);
         }
         else {
            required && assertRequired(required, this.fnName, this.pos, util.printf('must be of type %s', types));
            return defaultValue;
         }
      },

      _from: function(choices, defaultValue, required) {
         this.pos++;
         if( this.argList.length && util.contains(choices, this.argList[0]) ) {
            return this.argList.shift();
         }
         else {
            required && assertRequired(required, this.fnName, this.pos, util.printf('must be one of %s', choices));
            return defaultValue;
         }
      },

      _list: function(choices, defaultValue, required) {
         this.pos++;
         var out = [];
         var list = this.argList[0];
         if( this.argList.length && !util.isEmpty(list) && (util.isArray(list) || !util.isObject(list)) ) {
            this.argList.shift();
            if( util.isArray(list) ) {
               out = util.map(list, function(v) {
                  if( util.contains(choices, v) ) {
                     return v;
                  }
                  else {
                     badChoiceWarning(this.fnName, v, choices);
                     return undefined;
                  }
               }, this);
            }
            else {
               if( util.contains(choices, list) ) {
                  out = [list];
               }
               else {
                  badChoiceWarning(this.fnName, list, choices);
               }
            }
         }
         if( util.isEmpty(out) ) {
            required && assertRequired(required, this.fnName, this.pos, util.printf('choices must be in [%s]', choices));
            return defaultValue === true? choices : defaultValue;
         }
         return out;
      }

   };

   function isOfType(val, types) {
      if( !util.isArray(types) ) { types = [types]; }
      return util.contains(types, function(type) {
         switch(type) {
            case 'array':
               return util.isArray(val);
            case 'string':
               return typeof(val) === 'string';
            case 'number':
               return isFinite(parseInt(val, 10));
            case 'int':
               return isFinite(parseFloat(val));
            case 'object':
               return util.isObject(val);
            case 'function':
               return typeof(val) === 'function';
            case 'bool':
            case 'boolean':
               return !util.isObject(val); // be lenient here
            case 'strict_boolean':
               return typeof(val) === 'boolean';
            default:
               throw new Error('Args received an invalid data type: '+type);
         }
      });
   }

   function assertRequired(required, fnName, pos, msg) {
      msg = util.printf('%s: invalid argument at pos %d, %s', fnName, pos, msg);
      if( required === true ) {
         throw new Error(msg);
      }
      else if( util.has(log, required) ) {
         log[required](msg);
      }
      else {
         throw new Error('The `required` value passed to Args methods must either be true or a method name from logger');
      }
   }

   function badChoiceWarning(fnName, val, choices) {
      log.warn('%s: invalid choice %s, must be one of [%s]', fnName, val, choices);
   }

   function format(val, types) {
      switch(util.isArray(types)? types[0] : types) {
         case 'array':
            return util.isArray(val)? val : [val];
         case 'string':
            return val + '';
         case 'number':
            return parseFloat(val);
         case 'int':
            return parseInt(val, 10);
         case 'bool':
         case 'boolean':
         case 'strict_boolean':
            return !!val;
         case 'function':
         case 'object':
            return val;
         default:
            throw new Error('Args received an invalid data type: '+type);
      }
   }

   util.Args = Args;
})(exports, fb);
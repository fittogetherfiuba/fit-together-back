
function toCamelCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(toCamelCase);
    }
  
    if (obj instanceof Date) {
      return obj;
    }
  
    if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const camelKey = key
          .split('_')
          .map((part, index) =>
            index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
          )
          .join('');
        newObj[camelKey] = toCamelCase(value);
      }
      return newObj;
    }
  
    return obj;
  }

  module.exports = { toCamelCase };

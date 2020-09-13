export const promisify = <T>(callback: () => T): Promise<T> => {
    return new Promise((resolve, reject) => {
        setTimeout(() => resolve(callback()), 1);
    });
}

export const emptyArray = (n: number) => {
    return (Array(n).fill as any)();
}

export const forCallback = (n: number, c: (i: number) => void) => {
    for (let i = 0; i < n; i++) {
        c(i);
    }
}

export const getLocalStorage = (key: string) => {
    return localStorage.getItem(`tcnfm.${key}`);
}

export const setLocalStorage = (key: string, value: string) => {
    try {
        localStorage.setItem(`tcnfm.${key}`, value);
    } catch (e) {

    }
}

const floatArrayFilter = (obj: any): any => {
    if (typeof obj === "string" || typeof obj === "number") {
        return obj;
    }

    if (obj instanceof Float32Array) {
        return { F32A: Array.from(obj) };
    }
    if (obj.F32A) {
        return Float32Array.from(obj.F32A);
    }

    return (obj.map && obj.map((x: any) => floatArrayFilter(x)))
        || Object.keys(obj).reduce((prev, cur) => ({ ...prev, [cur]: floatArrayFilter(obj[cur]) }), {});
}


export const getLocalStorageObj = (key: string) => {
    const v = getLocalStorage(key);
    return v && floatArrayFilter(JSON.parse(v));
}

export const setLocalStorageObj = (key: string, value: string) => {
    setLocalStorage(key, JSON.stringify(floatArrayFilter(value)));
}

export const newFloat32Array = (...p: any[]) => {
    return new (Float32Array as any)(...p) as Float32Array;
}

export const splitCondensedString = (str: string) => {
    return str.replace(/(\d)(?![\d.,-])/g, "$1,").replace(/([^\d.,-])/g, "$1,").replace(/,$/, "").split(",");
}
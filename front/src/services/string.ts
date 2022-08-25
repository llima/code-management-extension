export function Transform(input: string): string {
    var trChars: any = {
        'ÁÄÂÀÃÅáäâàãå': 'a',
        'ÉĚËÈÊẼĔȆéěëèêẽĕȇ': 'e',
        'ÍÌÎÏíìîï': 'i',
        'ÓÖÒÔÕóöòôõ': 'o',
        'ÚŮÜÙÛúůüùû': 'u',
        'ñÑ': 'n',
        'ČÇĆčçć': 'c',
        '/': '-'
    };
    for (const key of Object.keys(trChars)) {
        input = input.replace(new RegExp('[' + key + ']', 'g'), trChars[key]);
    }
    return input
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}
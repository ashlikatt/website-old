addEventListener('load', function() {
    const diff = (new Date() - new Date('2004-11-12T00:00:00.000-05:00'));
    const time = Math.floor(diff / 1000 / 60 / 60 / 24 / 365);
    document.getElementById('age').innerHTML = 'I am ' + time + ' years old. ';
});
function tokenManager() {

    var randomizer = function() {
        return Math.random().toString(36).substr(2); // remove `0.`
    };

    var dateHash = function() {
        (+new Date).toString(36);  // "iepii89m"
    }
    
    var token = function() {
        return randomizer() + randomizer() + dateHash(); // to make it longer
    };

    this.generate = (emailId) => {
        console.log(token()); // "bnh5yzdirjinqaorq0ox1tf383nb3xr"
    }
    
  }
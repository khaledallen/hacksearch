
$.ajax('http://5d9cbcd566d00400145c9e57.mockapi.io/api/v1/search').done( function(results){
    console.log(results);
    Search.initialize(results);
    $('#filter-toggler').click(function() {
        $('#facet-wrapper').toggle('slow');
    });
});


const Search =  {
    dataset: [],
    searchInput: null,
    resultsContainer: null,
    facets: [],
    currentResults: [],
    activeIndex: null,
    primaryIndex: null,

    initialize(dataset) {
        this.dataset = this.currentResults = dataset;
        this.searchInput = document.getElementById("SearchString");
        this.resultsContainer = document.getElementById("resultsList");

        this.primaryIndex = new FlexSearch({
            tokenize: "forward",
            depth: 3,
            async: true,
            encoders: "advanced",
            doc: {
                id: "id",
                field: [
                    "title",
                    "abstract",
                    "details"
                ]
            }
        });
        this.primaryIndex.add(this.dataset);
        this.activeIndex = this.primaryIndex;
        this.setupSearchHandler();
        this.updateUI();
        this.collectFacets(this.dataset);
        this.populateFacets();
    },

    // facets: [
    //     {
    //         categoryName: category1,
    //         tags: [
    //             {
    //                 tagName: 'name',
    //                 count: 1,
    //                 active: false
    //             },
    //             {
    //                 tagName: 'name2',
    //                 count: 2,
    //                 active: true
    //             }
    //         ]
    //     }
    // ]

    collectFacets(dataToScan) {
        let lastActive = [];
        this.facets.forEach( cat => {
            cat.tags.forEach( tag => {
                if(tag.active) lastActive.push({tagName: tag.tagName, tagCategory: cat.categoryName});
            });
        });

        this.facets = [];
        dataToScan.forEach((lesson) => {
            lesson.keywords.forEach(lessonTag => {
                if (lessonTag.name != '') {
                    if (!this.facets.some(cat => cat.categoryName == lessonTag.tagType))
                        this.facets.push({ categoryName: "keyword", tags: [] });

                    const facetCategory = this.facets.find(cat => cat.categoryName == "keyword");

                    if (!facetCategory.tags.some(t => t.tagName == lessonTag.name)){
                        if(lastActive.some( last => last.tagName == lessonTag.name && last.tagCategory == "keyword")){
                            facetCategory.tags.push({ tagName: lessonTag.name, count: 1, active: true });
                        } else {
                            facetCategory.tags.push({ tagName: lessonTag.name, count: 1, active: false });
                        }
                    } else
                        facetCategory.tags.find(t => t.tagName == lessonTag.name).count += 1;
                }
            });
        });
    },


    populateFacets() {
        const facets = this.facets;
        $('#facet-wrapper').html('<h6 class="card-title">Filter by:</h6>');
        facets.forEach( category => {
            let facetCategoryContainer = $(`<div class="mt-3"><h5>${category.categoryName}</h5>
                <ul id="${category.categoryName}-facet-list" class="list-group list-group-flush"></ul>
                </div>`) .addClass('facet-category-container');

            $('#facet-wrapper').append(facetCategoryContainer);

            const tagsArray = category.tags;
            tagsArray.sort( (a,b) => {
                if(a.count >= b.count) return -1;
                else return 0
                });
            tagsArray.forEach( tag => {
                let facetListItem = buildFacetItem(category, tag);
                $('#' + category.categoryName + '-facet-list').append(facetListItem);
                if(tag.active) {
                    $('#' + category.categoryName.replace(/ /g, '-') + '-' + tag.tagName.replace(/ /g, '-') + '-facet').prop('checked', true);
                }
            })
            document.querySelectorAll('.facet-trigger').forEach( e => e.onchange = this.facetChangeHandler);
        })
    },

    facetChangeHandler(evt) {
        const facetCategory = $(this).data('facetCategory');
        const facetTag = $(this).data('facetTag');
        const category = Search.facets.find( cat => cat.categoryName == facetCategory);
        const tag = category.tags.find( tag => tag.tagName == facetTag );
        if($(this).is(':checked')) {
            tag.active = true;
        } else {
            tag.active = false;
        }
        Search.facetSearch();
    },

    facetSearchWhereFunction(item) {
        let found = false;
        let activeTags = false;
        Search.facets.forEach(category => {
            category.tags.forEach(tag => {
                if (tag.active) {
                    activeTags = true;
                    for (let i = 0; i < item.keywords.length; i++) {
                        let indexTag = item.keywords[i];
                        if (indexTag.name == tag.tagName) {
                            found = true;
                            break;
                        }
                    }
                }
            });
        });
        if(!activeTags) return true;
        return found;
    },

    facetSearch() {
        let newIndex = new FlexSearch({
            tokenize: "forward",
            depth: 3,
            async: true,
            encoders: "advanced",
            doc: {
                id: "id",
                field: [
                    "title",
                    "abstract",
                    "details"
                ]
            }
        });
        const results = Search.primaryIndex.where(Search.facetSearchWhereFunction);
        newIndex.add(results);
        Search.activeIndex = newIndex;
        Search.currentResults = results;
        Search.updateUI();
    },

    setupSearchHandler(){
        this.searchInput.addEventListener("keyup", this.searchHandler);
    },

    searchHandler(evt) {
        if(Search.searchInput.value == ''){
            Search.facetSearch();
            Search.updateUI();
            return;
        }
        const query = evt.currentTarget.value;
        Search.primaryIndex.search({
            query: query,
            suggest: true,
            limit: 20,
            page: true
        })
        .then(function(results){
            Search.currentResults = results;
            Search.updateUI();
        });
    },

    updateUI(){
        Search.resultsContainer.innerHTML = ''
        if (this.currentResults.length === 0 && this.searchInput.value !== '') {
            this.resultsContainer.innerHTML = "<h2>No results for your query</h2>";
        } else {
            Search.currentResults.forEach(result => {
                var hit = buildHit(result);
                Search.resultsContainer.innerHTML += hit;
            });
            this.collectFacets(this.currentResults);
        }
        this.populateFacets();
    },

}

function buildHit(raw) {
    var keys = raw.keywords.map( k => k.name);
    //var departments = raw.tags.filter( t => t.tagType == "department").map( d => d.name);
    var date = new Date(raw.createdAt).toLocaleDateString();
    return `<div class="row mb-2">
                <div class="col-sm-12">
                    <div class="card">
                        <h5 class="card-header">${raw.title}<span class="float-right" text-muted">id:${raw.id}</span></h5>
                        <div class="card-body">
                            <p class="card-text">${raw.abstract}</p>
                        </div>
                        <div class="card-footer">
                            <p>Created at: ${date}</p>
                            <hr/>
                            <span class="card-link text-muted">Keywords: ${keys.join(', ')}</span>
                        </div>
                    </div>
                </div>
            </div>`;
}

function buildFacetItem(facetCategory, facetTag) {
    const categoryName = facetCategory.categoryName;
    const tagName = facetTag.tagName;
    const tagCount = facetTag.count;
    return `<li class="list-group-item p-0 d-flex justify-content-between align-items-center">
                <input id="${categoryName.replace(/ /g, '-')}-${tagName.replace(/ /g, '-')}-facet" data-facet-category="${categoryName}" data-facet-tag="${tagName}" class="facet-trigger" type="checkbox" />
                <label class="py-1 px-3 d-flex justify-content-between align-items-center" style="width: 100%;" for="${categoryName}-${tagName}-facet">
                ${tagName}
                    <span class="badge badge-primary badge-pill">${tagCount}</span>
                </label>
            </li>`;
}

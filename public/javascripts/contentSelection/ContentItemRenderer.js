/**
 * For usage, see https://github.com/BYU-ARCLITE/Ayamel-Examples/wiki/Content-selection
 */
var ContentItemRenderer = (function(){

    var contentTemplates = {
        block:
            '<div class="contentItem blockFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
                <div class="contentDescription">\
                    <h3>{{title}}</h3>\
                    <div class="contentStats">{{views}} views</div>\
                    <div class="contentIcons">\
                        {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                        {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                        {{#definitions}}&nbsp;<span class="badge badge-magenta" title="This {{type}} has automatic translations.">T</span>{{/definitions}}\
                    </div>\
                </div>\
            </div>',

        table:
            '<div class="contentItem tableFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
                <div class="contentName">{{title}}</div>\
                <div class="contentStats">{{views}} Views</div>\
                <div class="contentIcons">\
                    {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                    {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                    {{#definitions}}&nbsp;<span class="badge badge-magenta" title="This {{type}} has automatic translations.">T</span>{{/definitions}}\
                </div>\
            </div>',

        icon:
            '<div class="contentItem iconFormat">\
                <div class="contentBadge {{type}}" style="{{#thumbnail}}background:url(\'{{thumbnail}}\') center no-repeat;background-size:cover;{{/thumbnail}}"></div>\
            </div>',

        iconContent: //popover for icons
            '<div class="inline-block pad-right-high pull-left">{{views}} views</div>\
            <div class="inline-block pad-left-high pull-right">\
                {{#annotations}}<i class="icon-bookmark" title="This {{type}} has annotations."></i>{{/annotations}}\
                {{#captions}}&nbsp;<img src="/assets/images/videos/captions.png" alt="This {{type}} has captions." title="This {{type}} has captions."/>{{/captions}}\
                {{#definitions}}&nbsp;<span class="badge badge-magenta" title="This {{type}} has automatic translations.">T</span>{{/definitions}}\
            </div>\
            <div class="clearfix pad-top-low"></div>'
    };

    var templateConditions = {
        captions: function(content){
            if(content.contentType === "text" || content.settings.showCaptions !== 'true')
                return false;
            return !!content.settings.captionTrack;
        },
        annotations: function(content){
            if(content.settings.showAnnotations !== 'true')
                return false;
            return !!content.settings.annotationDocument;
        },
        definitions: function(content){
            return (content.contentType === "text" || content.settings.showCaptions === 'true') && content.settings.allowDefinitions === 'true';
        }
    }

    /* args: content, format, click, courseId */
    function renderContent(args){
        var ractive,
            content = args.content,
            el = document.createElement('span');

        ractive = new Ractive({
            el: el,
            template: contentTemplates[args.format],
            data: {
                title: content.name,
                type: content.contentType,
                thumbnail: content.thumbnail,
                views: content.views,
                annotations: templateConditions.annotations(content),
                captions: templateConditions.captions(content),
                definitions: templateConditions.definitions(content)
            }
        });

        el.addEventListener('click', function(){
            if(typeof args.click === 'function'){
                args.click(args.content, args.courseId, $(this));
            }else{
                window.open(
                    args.courseId?"/course/" + args.courseId + "/content/" + args.content.id:
                    args.content.courseId?"/course/" + args.content.courseId + "/content/" + args.content.id:
                    "/content/" + args.content.id,
                    '_blank'
                );
            }
        },false);

        return el;
    }

    function enablePopover(content, element){
        var ractive = new Ractive({
            el: 'container',
            template: contentTemplates.iconContent,
            data: {
                type: content.contentType,
                views: content.views,
                annotations: templateConditions.annotations(content),
                captions: templateConditions.captions(content),
                definitions: templateConditions.definitions(content)
            }
        });

        $(element).popover({
            html:true,
            placement: "bottom",
            trigger: "hover",
            title: content.name,
            content: ractive.toHTML(),
            container: "body"
        });
    }

    function adjustFormat(content){
        var tableThreshold = 20;
        return (content.length > tableThreshold)?"table":"block";
    }

    /* args: format, content, holder, sorting, organization, labels, filters, courseId, click */
    function createSizer(args){
        var element = Ayamel.utils.parseHTML(
            '<div class="btn-group" data-toggle="buttons-radio">\
                <button class="btn" data-format="block"><i class="icon-th-large"></i></button>\
                <button class="btn" data-format="table"><i class="icon-th-list"></i></button>\
                <button class="btn" data-format="icon"><i class="icon-th"></i></button>\
            </div>'
        );

        $(element).button();
        element.querySelector("button[data-format='" + args.format + "']")
            .classList.add("active");

        [].forEach.call(element.querySelectorAll("button"),function(node){
            node.addEventListener('click', clickHandler, false);
        });

        function clickHandler(){
            ContentItemRenderer.renderAll({
                content: args.content,
                holder: args.holder,
                format: this.dataset["format"],
                sizing: true,
                sorting: args.sorting,
                organization: args.organization,
                labels: args.labels,
                filters: args.filters,
                courseId: args.courseId,
                click: args.click,
                clickHeader: args.clickHeader
            });
        }

        return element;
    }

    /* args: format, content, holder, sorting, labels, filters, courseId, click */
    function createOrganizer(args){
        var element = Ayamel.utils.parseHTML(
            '<div class="btn-group" data-toggle="buttons-radio">\
                <button class="btn" data-organization="contentType"><i class="icon-play-circle"></i> Content Type</button>\
                <button class="btn" data-organization="labels"><i class="icon-tags"></i> Labels</button>\
                <button class="btn" data-organization="title"><i class="icon-sort-by-alphabet"></i> Title</button>\
            </div>'
            // <button class="btn" data-organization="language"><i class="icon-globe"></i> Language</button>\
        );

        $(element).button();
        element.querySelector("button[data-organization='" + args.organization + "']")
            .classList.add("active");

        [].forEach.call(element.querySelectorAll("button"),function(node){
            node.addEventListener('click', clickHandler, false);
        });

        function clickHandler(){
            ContentItemRenderer.renderAll({
                content: args.content,
                holder: args.holder,
                format: args.format,
                sizing: true,
                sorting: args.sorting,
                organization: this.dataset["organization"],
                labels: args.labels,
                filters: args.filters,
                courseId: args.courseId,
                click: args.click,
                clickHeader: args.clickHeader
            });
        }

        return element;
    }

    return {
        /* args: content, format, click, courseId, holder */
        render: function(args){
            var element = renderContent(args);
            args.holder.appendChild(element);

            if(args.format === "icon"){
                // Enable the popover
                enablePopover(args.content, element);
            }
        },

        /* args: holder, format, sizing, content, sorting, organization, labels, filters, courseId, click */
        renderAll: function(args){
            // Clear out the holder
            args.holder.innerHTML = "";

            // Adjust args
            args.format = args.format || "block";
            if(args.format === "auto"){
                args.format = adjustFormat(args.content);
            }

            // Set up sizing
            if(args.sizing){
                args.holder.appendChild(createSizer({
                    format: args.format,
                    content: args.content,
                    holder: args.holder,
                    sorting: args.sorting,
                    organization: args.organization,
                    labels: args.labels,
                    filters: args.filters,
                    courseId: args.courseId,
                    click: args.click,
                    clickHeader: args.clickHeader
                }));
            }

            // Set up organizing
            var filters = args.filters;
            if(args.labels){
                args.organization = args.organization || "labels";
                args.holder.appendChild(createOrganizer({
                    content: args.content,
                    holder: args.holder,
                    format: args.format,
                    organization: args.organization,
                    sorting: args.sorting,
                    labels: args.labels,
                    filters: args.filters,
                    courseId: args.courseId,
                    click: args.click,
                    clickHeader: args.clickHeader
                }));
                if(args.organization === "labels"){
                    filters = {};
                    args.labels.forEach(function(label){
                        filters['<h3><i class="icon-tag"></i> ' + label + '</h3>'] = function(content){ // where the freak does this come from
                            return content.labels.indexOf(label) >= 0;
                        };

                    });
                    filters['<h3>Unlabeled</h3>'] = function(content){
                        return content.labels.length === 0;
                    };
                }else if(args.organization === "language"){
                    filters = {};
                    // for each content object, get the language from the resource library and add it to the filter
                    args.content.forEach(function(content){
                        ResourceLibrary.load(content.resourceId).then(function(resource){
                            var lang = resource.languages.iso639_3.map(function(langCode){
                                return '<em class="pad-left-high">' + Ayamel.utils.getLangName(langCode) + '</em>';
                            }).join('');
                            filters['<h3><i class="icon-globe"></i> ' + lang + '</h3>'] = true;
                        });
                    });

                }else if(args.organization === "title"){
                    filters = {};
                    args.content.forEach(function(obj){
                        filters['<h3> ' + obj.name[0] + '</h3>'] = function(content){
                            // filters the content by the first letter.
                            return (content.name[0] === obj.name[0]) ? true : false;
                        };
                    });
                }
            }else{
                args.organization = "contentType";
            }

            // Set up sorting
            if(args.sorting){
                // TODO: Setup sorting
                console.log("TODO: Setup sorting");
            }

            // Add the content to the holder
            if(filters){

                // Filter the content into categories
                // Also sorts the map so the filters will be sorted alphabetically
                Object.keys(filters).sort().forEach(function(filterName){
                    // Filter the content
                    var contentHolder, header,
                        filteredContent = args.content.filter(filters[filterName]);

                    // Sort the content inside of the filter
                    filteredContent.sort(function(a, b){
                        a = a.name;
                        b = b.name;
                        return b > a ? -1 : b < a ? 1 : 0;
                    });

                    // If there were results then show them
                    if(filteredContent.length){

                        // Add the name of the filter as a header
                        header = Ayamel.utils.parseHTML(filterName);
                        args.holder.appendChild(header);

                        // Add the content
                        contentHolder = document.createElement('div');
                        contentHolder.className = "contentHolder " + args.format + "Format";
                        args.holder.appendChild(contentHolder);

                        if(typeof args.clickHeader === 'function'){
                            header.addEventListener('click', function(){
                                args.clickHeader(header, contentHolder, filteredContent);
                            },false);
                        }

                        filteredContent.forEach(function(content){
                            ContentItemRenderer.render({
                                content: content,
                                holder: contentHolder,
                                format: args.format,
                                courseId: args.courseId,
                                click: args.click
                            })
                        });
                    }
                });
            }else{

                // No filter, so just show everything
                var contentHolder = document.createElement('div');
                contentHolder.className = "contentHolder";
                args.holder.appendChild(contentHolder);
                args.content.forEach(function(content){
                    ContentItemRenderer.render({
                        content: content,
                        holder: contentHolder,
                        format: args.format,
                        courseId: args.courseId,
                        click: args.click
                    });
                });
            }
        },
        standardFilters: {
            '<h2 class="pad-top-high"><i class="icon-film"></i> Videos</h2>': function(content){
                return content.contentType === "video";
            },
            '<h2 class="pad-top-high"><i class="icon-picture"></i> Images</h2>': function(content){
                return content.contentType === "image";
            },
            '<h2 class="pad-top-high"><i class="icon-volume-up"></i> Audio</h2>': function(content){
                return content.contentType === "audio";
            },
            '<h2 class="pad-top-high"><i class="icon-file"></i> Text</h2>': function(content){
                return content.contentType === "text";
            },
            '<h2 class="pad-top-high"><i class="icon-list-ol"></i> Playlists</h2>': function(content){
                return content.contentType === "playlist";
            },
            '<h2 class="pad-top-high"><i class="icon-question-sign"></i> Question Sets</h2>': function(content){
                return content.contentType === "questions";
            }
        }
    };
}());

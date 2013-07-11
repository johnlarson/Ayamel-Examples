/**
 * Created with IntelliJ IDEA.
 * User: camman3d
 * Date: 4/19/13
 * Time: 12:24 PM
 * To change this template use File | Settings | File Templates.
 */
var VideoRenderer = (function () {

    var translationHighlight;
    var captionTrackId;
    var cueNumber;

    function getLevel(args) {
        var levelAttr = args.coursePrefix + "level";
        var courseLevel = args.content.settings[levelAttr] || "1";
        var globalLevel = args.content.settings.level || "1";
        return Math.min(+courseLevel, +globalLevel);
    }

    function showTranscript(args) {
        return args.content.settings.includeTranscriptions && args.content.settings.includeTranscriptions === "true";
    }

    function determineTranscriptFromCue(transcripts, cue) {
        var captionTrackId = "unknown";
        transcripts.forEach(function (transcript) {
            if (transcript.title === cue.track.label && transcript.language === cue.track.language)
                captionTrackId = transcript.id;
        });
        return captionTrackId;
    }

    function createLayout(args) {

        var panes;
        var layout;

        switch (getLevel(args)) {
            case 1:
                layout = ContentLayoutManager.onePanel($(args.holder));
                break;
            case 2:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript"]);
                    layout = {
                        $player: panes.$player,
                        $transcript: panes.$Transcript
                    };
                } else {
                    layout = ContentLayoutManager.onePanel($(args.holder));
                }
                break;
            case 3:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript", "Definitions"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $transcript: panes.Transcript.$content
                    };
                } else {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.$Definitions
                    };
                }
                break;
            case 4:
                if (showTranscript(args)) {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Transcript", "Definitions", "Annotations"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $annotations: panes.Annotations.$content,
                        $annotationsTab: panes.Annotations.$tab,
                        $transcript: panes.Transcript.$content
                    };
                } else {
                    panes = ContentLayoutManager.twoPanel($(args.holder), ["Definitions", "Annotations"]);
                    layout = {
                        $player: panes.$player,
                        $definitions: panes.Definitions.$content,
                        $definitionsTab: panes.Definitions.$tab,
                        $annotations: panes.Annotations.$content,
                        $annotationsTab: panes.Annotations.$tab
                    };
                }
        }

        return layout;
    }

    function createTranslator(args) {
        if (getLevel(args) >= 3) {
            // Create the translator
            var translator = new TextTranslator();
            translator.addTranslationEngine(arcliteTranslationEngine, 1);
            translator.addTranslationEngine(wordReferenceTranslationEngine, 2);
            translator.addTranslationEngine(googleTranslationEngine, 3);

            // Add translation listeners
            // Translation started
            translator.addEventListener("translate", function (event) {

                // Figure out where we are translating from
                if ($(event.sourceElement).hasClass("transcriptCue")) {
                    ActivityStreams.predefined.transcriptionTranslation(event.data.captionTrackId, event.data.cueIndex, event.text);
                } else {
                    ActivityStreams.predefined.captionTranslation(event.data.captionTrackId, event.data.cueIndex, event.text);
                }
            });

            // Translation succeeded
            translator.addEventListener("translateSuccess", function (event) {
                var sourceText = event.text;
                var translations = event.translations;
                var engine = event.engine;

                var html =
                    '<div class="translationResult">' +
                        '<div class="sourceText">' + sourceText + '</div>' +
                        '<div class="translations">' + translations.join(", ") + '</div>' +
                        '<div class="engine">' + engine + '</div>' +
                        '</div>';
                args.layout.$definitions.append(html);
                args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;

                if (args.layout.$definitionsTab) {
                    args.layout.$definitionsTab.tab("show");
                    args.layout.$definitions[0].scrollTop = args.layout.$definitions[0].scrollHeight;
                }
            });

            // Handle errors
            translator.addEventListener("translateError", function (event) {
                alert("We couldn't translate \"" + event.text + "\" for you.");
            });

            return translator;
        }
        return null;
    }

    function createAnnotator(args) {

        if (getLevel(args) >= 4) {
            var textAnnotator = new TextAnnotator({manifests: args.manifests});
            textAnnotator.addEventListener("textAnnotationClick", function (event) {
                if (event.annotation.data.type === "text") {
                    args.layout.$annotations.html(event.annotation.data.value);
                }

                if (event.annotation.data.type === "image") {
                    args.layout.$annotations.html('<img src="' + event.annotation.data.value + '">');
                }

                if (event.annotation.data.type === "content") {
                    ContentCache.load(event.annotation.data.value, function(content) {

                        // Don't allow annotations, level 3+, transcriptions, or certain controls
                        content.settings.level = 2;
                        content.settings.includeTranscriptions = false;

                        ContentRenderer.render({
                            content: content,
                            holder: args.layout.$annotations[0],
                            annotate: false,
                            screenAdaption: {
                                fit: false
                            },
                            aspectRatio: Ayamel.aspectRatios.hdVideo,
                            components: {
                                left: ["play"],
                                right: ["captions", "timeCode"]
                            }
                        });
                    });
                }

                // Find the annotation doc
                var annotationDocId = "unknown";
                args.manifests.forEach(function (manifest) {
                    manifest.annotations.forEach(function (annotation) {
                        if (annotation.isEqualTo(event.annotation))
                            annotationDocId = manifest.resourceId;
                    });
                });
                ActivityStreams.predefined.viewTextAnnotation(annotationDocId, $(event.sourceElement).text());

                args.layout.$annotationsTab.tab("show");

            });
            return textAnnotator;
        }
        return null;
    }

    function setupVideoPlayer(args, callback) {
//        Ayamel.AddVideoPlayer(h5PlayerInstall, 1, function() {

        var components = args.components || {
            left: ["play", "volume", "captions"],
            right: ["rate", "fullScreen", "timeCode"]
        };
        var captions = args.transcripts;

        if (getLevel(args) === 1) {
            ["left", "right"].forEach(function(side) {
                var index = components[side].indexOf("captions");
                if (index >= 0)
                    components[side].splice(index, 1);
            });
            captions = null;
        }

        // Set the priority of players
        Ayamel.prioritizedPlugins.video = ["html5", "flash", "brightcove", "youtube"];
        Ayamel.prioritizedPlugins.audio = ["html5"];

        // Make sure the element will be contained on the page
        if (args.screenAdaption && args.screenAdaption.fit) {
            ScreenAdapter.containByHeight(args.layout.$player, Ayamel.aspectRatios.hdVideo, args.screenAdaption.padding);
        }

        var videoPlayer = new Ayamel.classes.AyamelPlayer({
            components: components,
            $holder: args.layout.$player,
            resource: args.resource,
            captionTracks: captions,
//            components: components,
            startTime: args.startTime,
            endTime: args.endTime,
            renderCue: args.renderCue || function (renderedCue, area) { // Check to use a different renderer
                var node = document.createElement('div');
                node.appendChild(renderedCue.cue.getCueAsHTML(renderedCue.kind === 'subtitles'));

                // Attach the translator
                if (args.translator) {
                    args.translator.attach(node, renderedCue.language, "en", {
                        captionTrackId: determineTranscriptFromCue(args.transcripts, renderedCue.cue),
                        cueIndex: "" + renderedCue.cue.track.cues.indexOf(renderedCue.cue)
                    });
                }

                // Add annotations
                if (args.annotator) {
                    args.annotator.annotate($(node));
                }

                renderedCue.node = node;
            },
            aspectRatio: Ayamel.aspectRatios.hdVideo,
            captionTrackCallback: args.captionTrackCallback
        });

        if (args.screenAdaption && args.screenAdaption.scroll) {
            videoPlayer.addEventListener("durationchange", function () {
                // The video is loaded. Scroll the window to see it
                if (!ScreenAdapter.isEntirelyVisible(args.layout.$player, args.screenAdaption.padding)) {
                    ScreenAdapter.scrollTo(args.layout.$player.offset().top - 10);
                }
            });
        }

        var registerPlay = true;
        videoPlayer.addEventListener("play", function (event) {
            // Sometimes two events appear, so only save one within a half second
            if (registerPlay) {
                var time = "" + videoPlayer.currentTime;
                ActivityStreams.predefined.playClick(time);
                registerPlay = false;
                setTimeout(function(){ registerPlay = true;}, 500);
            }
        });
        videoPlayer.addEventListener("pause", function (event) {
            var time = "" + videoPlayer.currentTime;
            ActivityStreams.predefined.pauseClick(time);
        });

        // Save the video player to the global context so we can access it from other places
        window.ayamelPlayer = videoPlayer;

        callback(videoPlayer);
//        });
    }

    function setupTranscripts(args) {
        if (showTranscript(args)) {
            var transcriptPlayer = new TranscriptPlayer2({
                captionTracks: args.captionTracks,
                $holder: args.layout.$transcript,
                syncButton: true,
                noUpdate: args.noUpdate,
                filter: function(cue, $cue) {
                    // Attach the translator
                    if (args.translator) {
                        args.translator.attach($cue[0], cue.track.language, "en", {
                            captionTrackId: cue.track.resourceId,
                            cueIndex: cue.track.cues.indexOf(cue)
                        });
                    }

                    // Add annotations
                    if (args.annotator) {
                        args.annotator.annotate($cue);
                    }
                }
            });

            // Cue clicking
            transcriptPlayer.addEventListener("cueClick", function(event) {
                var id = event.cue.track.cues.indexOf(event.cue);
                args.videoPlayer.currentTime = event.cue.startTime;
                ActivityStreams.predefined.transcriptCueClick(event.track.resourceId, id);
            });



            return transcriptPlayer;
        }
        return "nothing";
    }

    return {
        render: function (args) {

            // Load the caption tracks
            ContentRenderer.getTranscripts(args, function (transcripts) {
                args.transcripts = transcripts;

                // Load the annotations
                ContentRenderer.getAnnotations(args, function (manifests) {
                    args.manifests = manifests;

                    // Create the layout
                    args.layout = createLayout(args);

                    // Create the translator
                    args.translator = createTranslator(args);

                    // Create the annotator
                    args.annotator = createAnnotator(args);

                    var loaded = false;
                    function setupTranscriptWithPlayer(args) {
                        // Make sure that the stuff is defined
                        if (args.videoPlayer && args.transcriptPlayer && !loaded) {
                            if (args.transcriptPlayer !== "nothing") {
                                args.videoPlayer.addEventListener("timeupdate", function() {
                                    args.transcriptPlayer.currentTime = args.videoPlayer.currentTime;
                                });
                            }

                            if (args.callback) {
                                args.callback(args);
                            }
                            loaded = true;
                        }
                    }

                    // Prepare to create the Transcript when the video player is created
                    args.captionTrackCallback = function(tracks) {
                        args.captionTracks = tracks;
                        args.transcriptPlayer = setupTranscripts(args);

                        setupTranscriptWithPlayer(args);

                    };

                    // Set up the video player
                    setupVideoPlayer(args, function (videoPlayer) {
                        args.videoPlayer = videoPlayer;
                        setupTranscriptWithPlayer(args);
                    });
                });
            });
        }
    };
}());
$(function() {
	"use strict";
	var fcache = {};
	function getCueData(list){
		list.forEach(function(rel){
			var tel = rel.querySelector('.resourceName'),
				tid = tel.textContent;
			if(!tid || tid === "unknown"){ return; }
			ResourceLibrary.load(tid, function (resource) {
				var promise, url = resource.content.files[0].downloadUri;
				tel.textContent = resource.title;
				if(!fcache.hasOwnProperty(url)){					
					promise = new Promise(function(resolve, reject){
						TextTrack.get({
							kind: 'subtitles',
							lang: resource.languages.iso639_3[0],
							label: resource.title,
							url: url,
							success: function(track, mime){ resolve(track); }
						});
					});
					fcache[url] = promise;
				}else{
					promise = fcache[url];
				}
				promise.then(function(track){
					var ctext = rel.querySelector('.cueText'),
						cid = rel.querySelector('.cueNumber').textContent;
					ctext.textContent = track.cues.getCueById(cid).text;
				});
			});
		});
	}
	function getAnnData(list){
		list.forEach(function(el){
			var id = el.textContent;
			if(!id || id === "unknown"){ return; }
			ResourceLibrary.load(id, function (resource) {
				el.textContent = resource.title;
			});
		});
	}
	getCueData([].slice.call(document.querySelectorAll('.translationRecord')));
	getAnnData([].slice.call(document.querySelectorAll('.annotationRecord .resourceName')));
	getCueData([].slice.call(document.querySelectorAll('.clickRecord')));
});
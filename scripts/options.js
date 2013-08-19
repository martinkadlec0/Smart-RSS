chrome.runtime.getBackgroundPage(function(bg) {
	$(function() {
		$('select[id]').each(function(i, item) {
			$(item).val(bg.settings.get(item.id));
			$(item).change(handleChange);
		});
	});

	function handleChange(e) {
		var t = e.target;
		bg.settings.save(t.id, t.value);
	}
});
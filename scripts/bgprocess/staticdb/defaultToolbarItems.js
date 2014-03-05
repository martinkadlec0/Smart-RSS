define([], function() {
	return [
		{
			region: 'feeds',
			actions: ['feeds:addSource', 'feeds:addFolder', 'feeds:updateAll']
		}, 
		{
			region: 'articles',
			actions: ['articles:mark', 'articles:update', 'articles:undelete', 'articles:delete', '!dynamicSpace', 'articles:search']
		},
		{
			region: 'content',
			actions: ['content:mark', 'content:print', 'articles:download', 'content:delete', '!dynamicSpace', 'content:showConfig']
		}
	];
});
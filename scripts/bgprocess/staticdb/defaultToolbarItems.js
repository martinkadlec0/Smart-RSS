define([], function() {
	return [
		{
			version: 1,
			region: 'feeds',
			actions: ['feeds:addSource', 'feeds:addFolder', 'feeds:updateAll']
		},
		{
			version: 1,
			region: 'articles',
			actions: ['articles:mark', 'articles:update', 'articles:undelete', 'articles:delete', '!dynamicSpace', 'articles:search']
		},
		{
			version: 2,
			region: 'content',
			actions: ['content:mark', 'content:print', 'articles:download', 'content:delete', '!dynamicSpace', /*'global:report',*/ 'content:showConfig']
		}
	];
});
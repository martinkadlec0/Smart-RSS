define([], function () {
    return [
        {
            version: 1,
            region: 'feeds',
            actions: ['feeds:addSource', 'feeds:addFolder', 'feeds:updateAll', 'feeds:delete', 'feeds:scrollIntoView', '!dynamicSpace', 'feeds:toggleShowOnlyUnread']
        },
        {
            version: 1,
            region: 'articles',
            actions: ['articles:markAllAsRead', 'articles:update', 'articles:undelete', 'articles:delete', '!dynamicSpace', 'articles:toggleShowOnlyUnread', 'articles:search']
        },
        {
            version: 2,
            region: 'content',
            actions: ['content:mark', 'content:delete', '!dynamicSpace', 'content:changeView', 'content:showConfig']
        }
    ];
});

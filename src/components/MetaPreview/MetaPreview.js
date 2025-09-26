// Copyright (C) 2017-2023 Smart code 203358507

const React = require('react');
const PropTypes = require('prop-types');
const classnames = require('classnames');
const UrlUtils = require('url');
const { useTranslation } = require('react-i18next');
const { default: Icon } = require('@stremio/stremio-icons/react');
const { default: Button } = require('stremio/components/Button');
const { default: Image } = require('stremio/components/Image');
const ModalDialog = require('stremio/components/ModalDialog');
const SharePrompt = require('stremio/components/SharePrompt');
const { useServices } = require('stremio/services');
const CONSTANTS = require('stremio/common/CONSTANTS');
const routesRegexp = require('stremio/common/routesRegexp');
const useBinaryState = require('stremio/common/useBinaryState');
const ActionButton = require('./ActionButton');
const MetaLinks = require('./MetaLinks');
const MetaPreviewPlaceholder = require('./MetaPreviewPlaceholder');
const styles = require('./styles');
const { Ratings } = require('./Ratings');

const ALLOWED_LINK_REDIRECTS = [
    routesRegexp.search.regexp,
    routesRegexp.discover.regexp,
    routesRegexp.metadetails.regexp
];

const MetaPreview = React.forwardRef(({ className, compact, name, logo, background, runtime, releaseInfo, released, description, deepLinks, links, trailerStreams, inLibrary, toggleInLibrary, ratingInfo, metaId, libraryItem, watched }, ref) => {
    const { t } = useTranslation();
    const { core } = useServices();
    const [shareModalOpen, openShareModal, closeShareModal] = useBinaryState(false);
    const linksGroups = React.useMemo(() => {
        return Array.isArray(links) ?
            links
                .filter((link) => link && typeof link.category === 'string' && typeof link.url === 'string')
                .reduce((linksGroups, { category, name, url }) => {
                    const { protocol, path, pathname, hostname } = UrlUtils.parse(url);
                    if (category === CONSTANTS.IMDB_LINK_CATEGORY) {
                        if (hostname === 'imdb.com') {
                            linksGroups.set(category, {
                                label: name,
                                href: `https://www.stremio.com/warning#${encodeURIComponent(url)}`
                            });
                        }
                    } else if (category === CONSTANTS.SHARE_LINK_CATEGORY) {
                        linksGroups.set(category, {
                            label: name,
                            href: url
                        });
                    } else {
                        if (protocol === 'stremio:') {
                            if (pathname !== null && ALLOWED_LINK_REDIRECTS.some((regexp) => pathname.match(regexp))) {
                                if (!linksGroups.has(category)) {
                                    linksGroups.set(category, []);
                                }
                                linksGroups.get(category).push({
                                    label: name,
                                    href: `#${path}`
                                });
                            }
                        } else if (typeof hostname === 'string' && hostname.length > 0) {
                            if (!linksGroups.has(category)) {
                                linksGroups.set(category, []);
                            }
                            linksGroups.get(category).push({
                                label: name,
                                href: `https://www.stremio.com/warning#${encodeURIComponent(url)}`
                            });
                        }
                    }

                    return linksGroups;
                }, new Map())
            :
            new Map();
    }, [links]);
    const normalizeWatched = React.useCallback((val) => {
        let v = val;
        while (v && typeof v === 'object' && ('value' in v || 'val' in v)) {
            v = v.value ?? v.val;
        }

        if (v === true || v === 'true') return true;
        if (v === false || v === 'false') return false;
        if (typeof v === 'number') return v !== 0;
        if (typeof v === 'string') {
            const s = v.trim();
            if (s === '0') return false;
            if (s === '1') return true;
            if (s.length === 0) return false;
            return s.toLowerCase() !== 'false';
        }

        return !!v;
    }, []);

    const showHref = React.useMemo(() => {
        return deepLinks ?
            typeof deepLinks.player === 'string' ?
                deepLinks.player
                :
                typeof deepLinks.metaDetailsStreams === 'string' ?
                    deepLinks.metaDetailsStreams
                    :
                    typeof deepLinks.metaDetailsVideos === 'string' ?
                        deepLinks.metaDetailsVideos
                        :
                        null
            :
            null;
    }, [deepLinks]);
    const pendingMarkRef = React.useRef(null);
    const [optimisticWatched, setOptimisticWatched] = React.useState(null);

    React.useEffect(() => {
        if (!pendingMarkRef.current) return;
        const pending = pendingMarkRef.current;
        // If we now have a libraryItem._id or metaId, dispatch the mark action
        if ((libraryItem && libraryItem._id) || metaId) {
            const id = (libraryItem && libraryItem._id) || metaId;
            core.transport.dispatch({
                action: 'Ctx',
                args: {
                    action: 'LibraryItemMarkAsWatched',
                    args: {
                        id,
                        is_watched: pending.is_watched
                    }
                }
            });
            pendingMarkRef.current = null;
        }
    }, [libraryItem, metaId, core.transport]);

    React.useEffect(() => {
        const curStateVal = (libraryItem && libraryItem.state && (libraryItem.state.watched ?? libraryItem.state.is_watched)) ?? watched;
        const actual = normalizeWatched(curStateVal);
        if (optimisticWatched !== null && optimisticWatched !== actual) {
            // authoritative state differs from optimistic — sync
            setOptimisticWatched(null);
        }
    }, [libraryItem, watched, normalizeWatched]);
    const trailerHref = React.useMemo(() => {
        if (!Array.isArray(trailerStreams) || trailerStreams.length === 0) {
            return null;
        }

        return trailerStreams[0].deepLinks.player;
    }, [trailerStreams]);
    const renderLogoFallback = React.useCallback(() => (
        <div className={styles['logo-placeholder']}>{name}</div>
    ), [name]);
    return (
        <div className={classnames(className, styles['meta-preview-container'], { [styles['compact']]: compact })} ref={ref}>
            {
                typeof background === 'string' && background.length > 0 ?
                    <div className={styles['background-image-layer']}>
                        <Image className={styles['background-image']} src={background} alt={' '} />
                    </div>
                    :
                    null
            }
            <div className={styles['meta-info-container']}>
                {
                    typeof logo === 'string' && logo.length > 0 ?
                        <Image
                            className={styles['logo']}
                            src={logo}
                            alt={' '}
                            title={name}
                            renderFallback={renderLogoFallback}
                        />
                        :
                        renderLogoFallback()
                }
                {
                    (typeof releaseInfo === 'string' && releaseInfo.length > 0) || (released instanceof Date && !isNaN(released.getTime())) || (typeof runtime === 'string' && runtime.length > 0) || linksGroups.has(CONSTANTS.IMDB_LINK_CATEGORY) ?
                        <div className={styles['runtime-release-info-container']}>
                            {
                                typeof runtime === 'string' && runtime.length > 0 ?
                                    <div className={styles['runtime-label']}>{runtime}</div>
                                    :
                                    null
                            }
                            {
                                typeof releaseInfo === 'string' && releaseInfo.length > 0 ?
                                    <div className={styles['release-info-label']}>{releaseInfo}</div>
                                    :
                                    released instanceof Date && !isNaN(released.getTime()) ?
                                        <div className={styles['release-info-label']}>{released.getFullYear()}</div>
                                        :
                                        null
                            }
                            {
                                linksGroups.has(CONSTANTS.IMDB_LINK_CATEGORY) ?
                                    <Button
                                        className={styles['imdb-button-container']}
                                        title={linksGroups.get(CONSTANTS.IMDB_LINK_CATEGORY).label}
                                        href={linksGroups.get(CONSTANTS.IMDB_LINK_CATEGORY).href}
                                        target={'_blank'}
                                        {...(compact ? { tabIndex: -1 } : null)}
                                    >
                                        <div className={styles['label']}>{linksGroups.get(CONSTANTS.IMDB_LINK_CATEGORY).label}</div>
                                        <Icon className={styles['icon']} name={'imdb'} />
                                    </Button>
                                    :
                                    null
                            }
                        </div>
                        :
                        null
                }
                {
                    compact && typeof description === 'string' && description.length > 0 ?
                        <div className={styles['description-container']}>
                            {description}
                        </div>
                        :
                        null
                }
                {
                    Array.from(linksGroups.keys())
                        .filter((category) => {
                            return category !== CONSTANTS.IMDB_LINK_CATEGORY &&
                                category !== CONSTANTS.SHARE_LINK_CATEGORY &&
                                category !== CONSTANTS.WRITERS_LINK_CATEGORY;
                        })
                        .map((category, index) => (
                            <MetaLinks
                                key={index}
                                className={styles['meta-links']}
                                label={category}
                                links={linksGroups.get(category)}
                            />
                        ))
                }
                {
                    !compact && typeof description === 'string' && description.length > 0 ?
                        <div className={styles['description-container']}>
                            <div className={styles['label-container']}>
                                {t('SUMMARY')}
                            </div>
                            {description}
                        </div>
                        :
                        null
                }
            </div>
            <div className={styles['action-buttons-container']}>
                {
                    typeof toggleInLibrary === 'function' ?
                        <ActionButton
                            className={styles['action-button']}
                            icon={inLibrary ? 'remove-from-library' : 'add-to-library'}
                            label={inLibrary ? t('REMOVE_FROM_LIB') : t('ADD_TO_LIB')}
                            tooltip={compact}
                            tabIndex={compact ? -1 : 0}
                            onClick={toggleInLibrary}
                        />
                        :
                        null
                }
                {
                    typeof trailerHref === 'string' ?
                        <ActionButton
                            className={styles['action-button']}
                            icon={'trailer'}
                            label={t('TRAILER')}
                            tabIndex={compact ? -1 : 0}
                            href={trailerHref}
                            tooltip={compact}
                        />
                        :
                        null
                }
                {
                    typeof showHref === 'string' && compact ?
                        <ActionButton
                            className={classnames(styles['action-button'], styles['show-button'])}
                            icon={'play'}
                            label={t('SHOW')}
                            tabIndex={compact ? -1 : 0}
                            href={showHref}
                        />
                        :
                        null
                }
                {
                    !compact && ratingInfo !== null ?
                        <React.Fragment>
                            <Ratings
                                ratingInfo={ratingInfo}
                                className={styles['ratings']}
                            />
                            {
                                (libraryItem || typeof inLibrary === 'boolean') ?
                                    <div className={styles['watched-container']}>
                                        <Button
                                            className={styles['eye-button']}
                                            title={(function () {
                                                const cur = (libraryItem && libraryItem.state && (libraryItem.state.watched ?? libraryItem.state.is_watched)) ?? watched;
                                                const actual = normalizeWatched(cur);
                                                const display = optimisticWatched !== null ? optimisticWatched : actual;
                                                return display ? t('CTX_MARK_NON_WATCHED') : t('CTX_MARK_WATCHED');
                                            })()}
                                            onClick={() => {
                                                const curStateVal = (libraryItem && libraryItem.state && (libraryItem.state.watched ?? libraryItem.state.is_watched)) ?? watched;
                                                const actualWatched = normalizeWatched(curStateVal);
                                                const targetWatched = !actualWatched;

                                                if (typeof inLibrary === 'boolean' && inLibrary && metaId) {
                                                    core.transport.dispatch({
                                                        action: 'Ctx',
                                                        args: {
                                                            action: 'LibraryItemMarkAsWatched',
                                                            args: {
                                                                id: metaId,
                                                                is_watched: targetWatched
                                                            }
                                                        }
                                                    });
                                                    setOptimisticWatched(targetWatched);
                                                    return;
                                                }

                                                if (libraryItem && libraryItem._id) {
                                                    core.transport.dispatch({
                                                        action: 'Ctx',
                                                        args: {
                                                            action: 'LibraryItemMarkAsWatched',
                                                            args: {
                                                                id: libraryItem._id,
                                                                is_watched: targetWatched
                                                            }
                                                        }
                                                    });
                                                    setOptimisticWatched(targetWatched);
                                                    return;
                                                }

                                                if (typeof toggleInLibrary === 'function') {
                                                    pendingMarkRef.current = { is_watched: targetWatched };
                                                    setOptimisticWatched(targetWatched);
                                                    toggleInLibrary();
                                                }
                                            }}
                                        >
                                            {(() => {
                                                const cur = (libraryItem && libraryItem.state && (libraryItem.state.watched ?? libraryItem.state.is_watched)) ?? watched;
                                                const actualWatched = normalizeWatched(cur);
                                                const displayWatched = optimisticWatched !== null ? optimisticWatched : actualWatched;
                                                return <Icon className={styles['icon']} name={displayWatched ? 'eye-off' : 'eye'} />;
                                            })()}
                                        </Button>
                                    </div>
                                    : null
                            }
                        </React.Fragment>
                        :
                        null
                }
                {
                    linksGroups.has(CONSTANTS.SHARE_LINK_CATEGORY) && !compact ?
                        <React.Fragment>
                            <ActionButton
                                className={styles['action-button']}
                                icon={'share'}
                                label={t('CTX_SHARE')}
                                tooltip={true}
                                tabIndex={compact ? -1 : 0}
                                onClick={openShareModal}
                            />
                            {
                                shareModalOpen ?
                                    <ModalDialog title={t('CTX_SHARE')} onCloseRequest={closeShareModal}>
                                        <SharePrompt
                                            className={styles['share-prompt']}
                                            url={linksGroups.get(CONSTANTS.SHARE_LINK_CATEGORY).href}
                                        />
                                    </ModalDialog>
                                    :
                                    null
                            }
                        </React.Fragment>
                        :
                        null
                }
            </div>
        </div>
    );
});

MetaPreview.Placeholder = MetaPreviewPlaceholder;

MetaPreview.propTypes = {
    className: PropTypes.string,
    compact: PropTypes.bool,
    name: PropTypes.string,
    logo: PropTypes.string,
    background: PropTypes.string,
    runtime: PropTypes.string,
    releaseInfo: PropTypes.string,
    released: PropTypes.instanceOf(Date),
    description: PropTypes.string,
    deepLinks: PropTypes.shape({
        metaDetailsVideos: PropTypes.string,
        metaDetailsStreams: PropTypes.string,
        player: PropTypes.string
    }),
    links: PropTypes.arrayOf(PropTypes.shape({
        category: PropTypes.string,
        name: PropTypes.string,
        url: PropTypes.string
    })),
    trailerStreams: PropTypes.array,
    inLibrary: PropTypes.bool,
    toggleInLibrary: PropTypes.func,
    ratingInfo: PropTypes.object,
    metaId: PropTypes.string,
    libraryItem: PropTypes.shape({
        _id: PropTypes.string,
        state: PropTypes.object
    }),
    watched: PropTypes.bool,
};

module.exports = MetaPreview;

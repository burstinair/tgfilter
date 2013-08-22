(function (document) {

var TYPE_LIST = 1;
var TYPE_SINGLE_PICTURE = 2;
var TYPE_TEXT = 3;

var CONTAINER_SIZE_LIMIT = 5;
var KIND_COUNT_RATE_LIMIT = 0.4;
var LIST_ITEM_COUNT_LIMIT = 5;

var SCROLL_TRIG_LIMIT = 200;

var each = function (callback) {
    for(var i = 0, l = this.length; i < l; ++i) {
        if(callback(i, this[i])) {
            break;
        }
    }
};
var indexOf = function (item) {
    for(var i = 0, l = this.length; i < l; ++i) {
        if(item === this[i]) {
            return i;
        }
    }
    return -1;
};
var load_document = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if(xhr.readyState == 4) {
            var el = document.createElement("html");
            el.innerHTML = xhr.responseText;
            var res = document.createDocumentFragment();
            res.appendChild(el);
            callback(res);
        }
    };
    xhr.open("GET", url, true);
    xhr.send();
};
var is_next_btn = function (btn) {
    return btn.tagName.toLowerCase() == 'a' && /^.?(下一页|下页).?$/.test(btn.innerText.trim());
};
var get_class_kind = function (el) {
    var res = "";
    var classList = [];
    each.call(el.classList, function (i, c) {
        classList.push(c);
    });
    if(classList.length > 0) {
        res += "." + classList.join('.');
    }
    return res;
};
var get_id_kind = function (el) {
    var res = "";
    if(el.id && el.id != '') {
        res += '#' + el.id;
    }
    return res;
};
var get_kind = function (el) {
    return get_class_kind(el) + get_id_kind(el);
};
var get_position = function(el) {
    var path = [], path_full = [];
    var p = el;
    while(p.tagName.toLowerCase() != 'body') {
        path.push(p.tagName);
        path_full.push(p.tagName + get_kind(p));
        p = p.parentElement;
    }
    var res = [
        {queryString: path_full.reverse().join(' ')},
        {queryString: path.reverse().join(' ') + get_kind(el)}
    ];
    for(var i = 0; i < res.length; ++i) {
        res[i].index = indexOf.apply(document.querySelectorAll(res[i].queryString), [el]);
    }
    return res;
};
var get_el = function(position, document, satisfy) {
    for(var j = 0, lp = position.length; j < lp; ++j) {
        var els = document.querySelectorAll(position[j].queryString);
        if(els.length > position[j].index && (!satisfy || satisfy(els[position[j].index]))) {
            return els[position[j].index];
        }
        for(var i = 0, l = els.length; i < l; ++i) {
            if(!satisfy || satisfy(els[i])) {
                return els[i];
            }
        }
    }
};
var get_path = function (el) {
    var res = [];
    while(el.tagName.toLowerCase() != 'body') {
        res.push(el);
        el = el.parentNode;
    }
    res.push(el);
    return res.reverse();
};
var get_size = function (el) {
    return el.offsetHeight * el.offsetWidth;
};
var get_pager = function (next_btn) {
    var res = next_btn;
    while(res.parentElement.children.length == 1) {
        res = res.parentElement;
    }
    res = res.parentElement;
    while(res.parentElement.children.length == 1) {
        res = res.parentElement;
    }
    return res;
};
var show_tip = function (msg) {
    var tip_panel = document.createElement("div");
    tip_panel.classList.add('burst-paging-terminator-tip');
    tip_panel.innerHTML = "<div class='bkg'></div><div class='msg'>" + msg + "</div>";
    document.querySelector("body").appendChild(tip_panel);
};

var search_container_in_node = function (el, container_results) {
    //TODO: Single Picture
    
    //text container
    var only_text_node = true;
    for(var i = 0, l = el.childNodes.length; i < l; ++i) {
        if(el.childNodes[i].nodeType != Node.TEXT_NODE) {
            only_text_node = false;
            break;
        }
    }
    if(only_text_node) {
        container_results.push({
            container: el,
            type: TYPE_TEXT
        });
        return;
    }

    //list container
    var kind_dic = {};
    var child_count = el.children.length, kind_count = 0;
    if(child_count >= LIST_ITEM_COUNT_LIMIT) {
        for(var i = 0; i < child_count; ++i) {
            var cel = el.children[i];
            var kind = cel.tagName;
            if(!kind_dic[kind]) {
                ++kind_count;
                kind_dic[kind] = true;
            }
        }
        if(kind_count / child_count < KIND_COUNT_RATE_LIMIT) {
            container_results.push({
                container: el,
                type: TYPE_LIST
            });
        }
    }
    for(var i = 0; i < child_count; ++i) {
        search_container_in_node(el.children[i], container_results)
    }
};
var search_container = function (document, pager) {
    var container_results = [];
    search_container_in_node(document.querySelector('body'), container_results);
    var res, max_dis = 0, max_size = 0;
    var pager_path = get_path(pager);
    for(var i = 0, l = container_results.length; i < l; ++i) {
        var container_context = container_results[i];
        var container_path = get_path(container_context.container);
        var j = 0;
        while(pager_path[j] == container_path[j] && j < pager_path.length && j < container_path.length) {
            ++j;
        }
        var cur_size = get_size(container_context.container);
        if(j < pager_path.length && j < container_path.length && (
            !max_size ||
                (j > max_dis && max_size / cur_size <= CONTAINER_SIZE_LIMIT) ||
                (j == max_dis && cur_size > max_size) ||
                (cur_size / max_size > CONTAINER_SIZE_LIMIT)
            )
        ) {
            max_dis = j;
            max_size = get_size(container_context.container);
            res = container_context;
        }
    }
    
    if(res.type == TYPE_LIST) {
        var kind_dic = {}, main_kind, max_count = 0;
        for(var i = 0, l = res.container.children.length; i < l; ++i) {
            var cel = res.container.children[i];
            var kind = cel.tagName + get_class_kind(cel);
            if(!kind_dic[kind]) {
                kind_dic[kind] = {
                    tagName: cel.tagName,
                    classList: cel.classList,
                    id: cel.id,
                    count: 1
                };
                if(max_count == 0) {
                    max_count = 1;
                    main_kind = kind_dic[kind];
                }
            } else {
                kind_dic[kind].count++;
                if(kind_dic[kind].count > max_count) {
                    max_count = kind_dic[kind].count;
                    main_kind = kind_dic[kind];
                }
            }
        }
        res.should_exclude = function (el) {
            if(el.nodeType != Node.ELEMENT_NODE) {
                return false;
            }
            if(el.tagName != main_kind.tagName) {
                return true;
            }
            if(el.classList.length == 0 && main_kind.classList.length == 0) {
                return false;
            }
            for(var i = 0, l = el.classList.length; i < l; ++i) {
                if(indexOf.apply(main_kind.classList, [el.classList[i]]) != -1) {
                    return false;
                }
            }
            return true;
        };
    } else {
        res.should_exclude = function (el) {
            return false;
        };
    }
    return res;
};

var current_context, view_container;
var detect_context = function (document) {
    var res = {};
    if(!current_context) {
        var next_btns = document.querySelectorAll('a');
        each.call(next_btns, function (i, btn) {
            if(is_next_btn(btn)) {
                res.next_btn = btn;
                res.next_btn_position = get_position(btn);
                res.pager = get_pager(res.next_btn);
                return true;
            }
        });
        if(res.pager == null) {
            show_tip("未探测到分页。");
            return null;
        }
        var container_context = search_container(document, res.pager);
        res.should_exclude = container_context.should_exclude;
        res.container = container_context.container;
        res.container_position = get_position(res.container);
    } else {
        res.should_exclude = current_context.should_exclude;
        res.next_btn_position = current_context.next_btn_position;
        res.container_position = current_context.container_position;
        res.next_btn = get_el(res.next_btn_position, document, function (btn) {
            return btn.innerHTML == current_context.next_btn.innerHTML;
        });
        res.container = get_el(res.container_position, document);
    }
    
    if(!current_context && res.next_btn == null) {
        return null;
    }
    if(res.next_btn) {
        res.next_url = res.next_btn.attributes['href'].value;
    }
    res.items = [];
    each.call(res.container.childNodes, function (i, el) {
        if(!res.should_exclude(el)) {
            res.items.push(el);
        }
    });
    return res;
};

var merge_view = function (view_container, context) {
    each.call(context.items, function (i, el) {
        view_container.appendChild(el.cloneNode(true));
    });
};

var loading = false;
var load_next_page = function () {
    if(!loading && current_context && current_context.next_url) {
        loading = true;
        load_document(current_context.next_url, function (next_doc) {
            current_context = detect_context(next_doc);
            if(current_context) {
                merge_view(view_container, current_context);
            }
            loading = false;
        });
    }
};

var register_scroll_check = function () {
    document.addEventListener('scroll', function () {
        if(document.height - window.innerHeight - window.scrollY < SCROLL_TRIG_LIMIT) {
            load_next_page();
        }
    });
};

var enable = function () {
    current_context = detect_context(document);
    if(current_context) {
        view_container = current_context.container;
        current_context.pager.style.display = 'none';
        register_scroll_check();
    }
};
enable();

})(document);
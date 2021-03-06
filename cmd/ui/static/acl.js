var selected_rule = 0;
var editing = false;

$(document).ready(function() {
    $("#acl-selection").change(function(e) {
	window.location.href = "/acl/" + $(this).val();
    });

    $("body").keypress(keypressHandler);

    // New ACL.
    $("#new-acl").keydown(function(e) {
	if (e.keyCode != 13) { return; }
	newACL($(this).val());
    });

    // Delete ACL.
    $("#delete-acl").click(function() {
	var acl_id = $("#current-acl").val();
	doDelete("/acl/" + acl_id, {}, function(){
	    window.location.href = "/acl/";
	});
    });

    // Rename ACL.
    $("#rename-acl").click(function() {
	var acl_id = $("#current-acl").val();
	var new_name = $("#rename-name").val();
	doPost("/acl/" + acl_id, {"comment": new_name}, function(){
	    window.location.reload();
	});
    });

    // Rule selection.
    $("#acl-rules input.checked-rules").change(function() { checkedRulesChanged($(this)); });
    changeSelected(0);
    $("#acl-move-selection").change(updateActionButtons);

    // Rule editing.
    var f = function(e) { ruleTextChanged($(this), e); }
    $("#acl-rules input[type=text],#acl-rules select").change(f);
    $("#acl-rules input[type=text]").keydown(f);
    $("#button-save").click(save);
    $("#button-move").click(move);
    $("#button-delete").click(delete_button);

    updateActionColors();
});

function updateActionColors() {
    var o = $("select.acl-rules-rule-action option[value='allow']").parent();
    o.removeClass("acl-button-block");
    o.removeClass("acl-button-allow");
    $("select.acl-rules-rule-action option[value='allow']:selected").parent().addClass("acl-button-allow");
    $("select.acl-rules-rule-action option[value='ignore']:selected").parent().addClass("acl-button-block");
}

function delete_button() {
    var rules = get_all_checked();
    var data = {"rules": rules};
    doPost("/rule/delete",
	   data,
	   function() {
	       console.log("Delete successful");
	       for (var i = 0; i < rules.length; i++) {
		   $("#acl-rules-row-" + rules[i]).remove();
		   changeSelected(0);
	       }
	   });
}

function get_ruleid_by_index(n) {
    return $("#acl-rules tbody tr:nth-child("+(selected_rule+1)+") input.checked-rules").data("ruleid");
}

function save() {
    var id = get_ruleid_by_index(selected_rule);
    var data = {
	"type": $(".acl-rules-rule-type[data-ruleid='"+id+"']").val(),
	"value": $(".acl-rules-rule-value[data-ruleid='"+id+"']").val(),
	"action": $(".acl-rules-rule-action[data-ruleid='"+id+"']").val(),
	"comment": $(".acl-rules-rule-comment[data-ruleid='"+id+"']").val()
    };
    doPost("/rule/" + id,
	   data,
	   function() {
	       window.location.reload();
	   });
}

function ruleTextChanged(me, e) {
    var ruleid = me.data("ruleid");
    if ('keyCode' in e) {
	if (e.keyCode == 13) {
	    $("#button-save").click();
	    return;
	}
    }

    // Remove all checkmarks.
    $("#acl-rules input.checked-rules").prop("checked", false);
    $("#acl-rules tr").removeClass("selected");
    updateActionButtons();

    // Disable all but active rule for editing.
    $("#acl-rules input,#acl-rules select").each(function(index) {
	if ($(this).data("ruleid") !== ruleid) {
	    $(this).attr("disabled", "disabled");
	}
    });

    // Set active.
    $("#acl-rules input.checked-rules").each(function(index) {
	if ($(this).data("ruleid") === ruleid) {
	    changeSelected(index-selected_rule);
	}
    });

    // Enable save button.
    $("#button-save").removeAttr("disabled");

    // Disable active-changing.
    editing = true;
    updateActionColors();
}

function newACL(name) {
    doPost("/acl/new",
	   {"comment": name},
	   function(resp) {
	       window.location.href = "/acl/" + resp.acl;
	   });
}

function checkedRulesChanged(me) {
    var ruleid = me.data("ruleid");
    if (me.prop("checked")) {
	$("#acl-rules-row-"+ruleid).addClass("selected");
    } else {
	$("#acl-rules-row-"+ruleid).removeClass("selected");
    }
    updateActionButtons();
}

function keyCheck() {
    var o = $("#acl-rules tbody tr:nth-child("+(selected_rule+1)+") input.checked-rules");
    o.prop("checked", !o.prop("checked"));
    checkedRulesChanged(o);
    updateActionButtons();
}

function updateActionButtons() {
    var o = $(".button-check-action");
    if ($(".checked-rules:checked").length > 0) {
	o.removeAttr("disabled");
    } else {
	o.attr("disabled", "disabled");
    }
    // Disable 'move' if no destination is set.
    if ($("#acl-move-selection option:selected").index() === 0) {
	$("#button-move").attr("disabled", "disabled");
    }
}

function keypressHandler(event) {
    switch (event.which) {
    case 106: // 'j'
	changeSelected(1);
	break;
    case 107: // 'k'
	changeSelected(-1);
	break;
    case 120: // 'x'
	keyCheck();
	break;
    default:
	console.log("Keypress: " + event.which);
	break;
    }
}

function changeSelected(delta) {
    if (editing) {
	return;
    }
    var o;
    $("#acl-rules tbody tr:nth-child("+(selected_rule+1)+") td.acl-rules-row-selected").text("");
    selected_rule += delta;
    if (selected_rule < 0) {
	selected_rule = 0;
    }
    var c = $("#acl-rules tbody tr").length - 1;
    if (selected_rule >= c) {
	selected_rule = c;
    }
    o = $("#acl-rules tbody tr:nth-child("+(selected_rule+1)+") td.acl-rules-row-selected");
    o.text(">");
    var screen_pos = o[0].getBoundingClientRect().top;
    var delta = 0;
    var min = 20;
    var max = window.innerHeight - 50;
    if (screen_pos < min) {
	delta = screen_pos - min;
    } else if (screen_pos > max) {
	delta = screen_pos - max;
    }
    window.scroll(0, window.scrollY+delta);
}

function get_all_checked() {
    var rules = new Array;
    $(".checked-rules:checked").each(function(index) {
	rules[index] = $(this).data("ruleid");
    });
    return rules;
}

function move() {
    var data = {};
    var rules = get_all_checked();
    data["destination"] = $("#acl-move-selection").val();
    data["rules"] = rules;
    doPost("/acl/move",
	   data,
	   function() {
	       console.log("success");
	       for (var i = 0; i < rules.length; i++) {
		   $("#acl-rules-row-" + rules[i]).remove();
		   changeSelected(0);
	       }
	   });
}

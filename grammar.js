'use strict';

function optseq() {
  return optional(prec.left(seq.apply(null, arguments)))
}

function repseq() {
  return repeat(prec.left(seq.apply(null, arguments)))
}

function sep1(separator, rule) {
  return prec.left(seq(
    rule,
    repeat(prec.left(seq(separator, rule)))
  ))
}

const rules = {

  // B.1 SystemRDL source text

  source_file: $ => repeat($.description),

  description: $ => choice(
    $.component_def,
    $.enum_def,
    $.property_definition,
    $.struct_def,
    $.constraint_def,
    $.explicit_component_inst,
    $.property_assignment,
 ),

  // B.2 User-defined properties

  property_definition: $ => seq('property', $.id, '{', $.property_body, '}', ';'),

  property_body: $ => repeat1($.property_attribute),

  property_attribute: $ => choice(
    $.property_type,
    $.property_usage,
    $.property_default,
    $.property_constraint,
  ),

  property_type: $ => seq('type', '=', $.property_data_type, optional($.array_type), ';'),

  property_data_type: $ => choice(
    $.component_primary_type,
    'ref',
    'number',
    $.basic_data_type,
  ),

  property_usage: $ => seq('component', '=', $.property_comp_types, ';'),

  property_comp_types: $ => sep1('|', $.property_comp_type),

  property_comp_type: $ => choice(
    $.component_type,
    'constraint',
    'all',
  ),

  property_default: $ => seq('default', '=', $.constant_expression, ';'),

  property_constraint: $ => seq('constraint', '=', $.property_constraint_type, ';'),

  property_constraint_type: $ => 'componentwidth',

  // B.3 Component definition

  component_def: $ => choice(
    seq($.component_named_def, $.component_inst_type, $.component_insts, ';'),
    seq($.component_anon_def, $.component_inst_type, $.component_insts, ';'),
    seq($.component_named_def, optional($.component_insts), ';'),
    seq($.component_anon_def, $.component_insts, ';'),
    seq($.component_inst_type, $.component_named_def, $.component_insts, ';'),
    seq($.component_inst_type, $.component_anon_def, $.component_insts, ';')
  ),

  component_named_def: $ => seq($.component_type, $.id, optional($.param_def), $.component_body),

  component_anon_def: $ => seq($.component_type, $.component_body),

  component_body: $ => seq('{', repeat($.component_body_elem), '}'),

  component_body_elem: $ => choice(
    $.component_def,
    $.enum_def,
    $.struct_def,
    $.constraint_def,
    $.explicit_component_inst,
    $.property_assignment
  ),

  component_type: $ => choice(
    $.component_primary_type,
    'signal'
  ),

  component_primary_type: $ => choice('addrmap', 'regfile', 'reg', 'field', 'mem'),

  explicit_component_inst: $ => seq(
    optional($.component_inst_type),
    optional($.component_inst_alias),
    $.id,
    $.component_insts,
    ';'
  ),

  component_insts: $ => seq(
    optional($.param_inst), sep1(',', $.component_inst)
  ),

  component_inst: $ => seq(
    $.id, optional($.component_inst_array_or_range),
    optseq('=', $.constant_expression),
    optseq('@', $.constant_expression),
    optseq('+=', $.constant_expression),
    optseq('%=', $.constant_expression),
  ),

  component_inst_alias: $ => seq('alias', $.id),

  component_inst_type: $ => choice('external', 'internal'),

  component_inst_array_or_range: $ => choice(
    repeat1($.array),
    $.range
  ),

  // B.4 Struct definitions

  struct_def: $ => seq(
    optional('abstract'), 'struct', $.id, optseq(':', $.id), $.struct_body, ';'
  ),

  struct_body: $ => seq('{', repeat($.struct_elem), '}'),

  struct_elem: $ => seq($.struct_type, $.id, optional($.array_type), ';'),

  struct_type: $ => choice($.data_type, $.component_type),

  // B.5 Constraints

  constraint_def: $ => choice(
    seq('constraint', $.constraint_def_exp, ';'),
    seq('constraint', $.constraint_def_anon, ';')
  ),

  constraint_def_exp: $ => seq($.id, $.constraint_body, optional($.constraint_insts)),

  constraint_def_anon: $ => seq($.constraint_body, $.constraint_insts),

  constraint_insts: $ => sep1(',', $.id),

  constraint_body: $ => seq('{', repseq($.constraint_elem, ';'), '}'),

  constraint_prop_assignment: $ => seq($.id, '=', $.constant_expression),

  constraint_elem: $ => choice(
    $.constant_expression,
    $.constraint_prop_assignment,
    seq($.constraint_lhs, 'inside', '{', $.constraint_values, '}'),
    seq($.constraint_lhs, 'inside', $.id)
  ),

  constraint_values: $ => sep1(',', $.constraint_value),

  constraint_value: $ => choice(
    $.constant_expression,
    seq('[', $.constant_expression, ':', $.constant_expression, ']')
  ),

  constraint_lhs: $ => choice('this', $.instance_ref),

  // B.6 Parameters

  param_def: $ => seq('#', '(', sep1(',', $.param_def_elem), ')'),

  param_def_elem: $ => seq($.data_type, $.id, optional($.array_type), optseq('=', $.constant_expression)),

  param_inst: $ => seq('#', '(', sep1(',', $.param_elem), ')'),

  param_elem: $ => seq('.', $.id, '(', $.param_value, ')'),

  param_value: $ => $.constant_expression,

  // B.7 Enums

  enum_def: $ => seq('enum', $.id, $.enum_body, ';'),

  enum_body: $ => seq('{', repeat($.enum_entry), '}'),

  enum_entry: $ => seq(
    $.id,
    optseq('=', $.constant_expression),
    optional($.enum_property_assignment),
    ';'
  ),

  enum_property_assignment: $ => seq(
    '{', repseq($.explicit_prop_assignment, ';'), '}'
  ),

  // B.8 Property assignment

  property_assignment: $ => choice(
    $.explicit_or_default_prop_assignment,
    $.post_prop_assignment
  ),

  explicit_or_default_prop_assignment: $ => choice(
    seq(optional('default'), $.explicit_prop_modifier, ';'),
    seq(optional('default'), $.explicit_prop_assignment, ';')
  ),

  explicit_prop_modifier: $ => seq($.prop_mod, $.id),

  explicit_encode_assignment: $ => seq('encode', '=', $.id),

  explicit_prop_assignment: $ => choice(
    seq($.prop_assignment_lhs, optseq('=', $.prop_assignment_rhs)),
    $.explicit_encode_assignment
  ),

  post_encode_assignment: $ => seq($.instance_ref, '->', 'encode', '=', $.id),

  post_prop_assignment: $ => choice(
    seq($.prop_ref, optseq('=', $.prop_assignment_rhs), ';'),
    seq($.post_encode_assignment, ';')
  ),

  prop_mod: $ => choice('posedge', 'negedge', 'bothedge', 'level', 'nonsticky'),

  prop_assignment_lhs: $ => choice(
    $.prop_keyword,
    $.id
  ),

  prop_keyword: $ => choice('sw', 'hw', 'rclr', 'rset', 'woclr', 'woset'),

  prop_assignment_rhs: $ => choice(
    $.constant_expression,
    $.precedencetype_literal
  ),

  // B.9 Struct literal

  struct_literal: $ => seq($.id, '\'{', optional(sep1(',', $.struct_literal_elem)), '}'),

  // struct_literal_body1: $ => sep1(',', $.struct_literal_elem),

  struct_literal_elem: $ => seq($.id, ':', $.constant_expression),

  // B.10 Array literal

  array_literal: $ => seq('\'{', optional(sep1(',', $.constant_expression)), '}'),

  // array_literal_body1: $ => sep1(',', $.constant_expression),

  // B.11 Reference

  instance_ref: $ => sep1('.', $.instance_ref_element),

  prop_ref: $ => seq($.instance_ref, '->', choice($.prop_keyword, $.id)),

  instance_or_prop_ref: $ => choice(
    seq($.instance_ref, '->', $.prop_keyword),
    seq($.instance_ref, '->', $.id),
    $.instance_ref
  ),

  instance_ref_element: $ => seq($.id, repeat($.array)),

  // B.12 Array and range

  range: $ => seq('[', $.constant_expression, ':', $.constant_expression, ']'),

  array: $ => seq('[', $.constant_expression, ']'),

  array_type: $ => seq('[', ']'),

  // B.13 Concatenation

  constant_concatenation: $ => seq('{', sep1(',', $.constant_expression), '}'),

  constant_multiple_concatenation: $ => seq(
    '{', $.constant_expression, $.constant_concatenation, '}'
  ),

  // B.14 Data types

  integer_type: $ => choice(
    $.integer_vector_type,
    $.integer_atom_type
  ),

  integer_atom_type: $ => 'longint',

  integer_vector_type: $ => 'bit',

  simple_type: $ => $.integer_type,

  signing: $ => 'unsigned',

  basic_data_type: $ => choice(
    seq($.simple_type, optional($.signing)),
    'string',
    'boolean',
    $.id
  ),

  data_type: $ => choice(
    $.basic_data_type,
    'accesstype',
    'addressingtype',
    'onreadtype',
    'onwritetype'
  ),

  // B.15 Literals

  boolean_literal: $ => choice('true', 'false'),

  number: $ => /[0-9]+/, // FIXME

  string_literal: $ => seq('"', /\w+/, '"'),

  enumerator_literal: $ => seq($.id, '::', $.id),

  accesstype_literal: $ => choice('na', 'rw', 'wr', 'r', 'w', 'rw1', 'w1'),

  onreadtype_literal: $ => choice('clr', 'rset', 'ruser'),

  onwritetype_literal: $ => choice('woset', 'woclr', 'wot', 'wzs', 'wzc', 'wzt', 'wclr', 'wset', 'wuser'),

  addressingtype_literal: $ => choice('compact', 'regalign', 'fullalign'),

  precedencetype_literal: $ => choice('hw', 'sw'),

  // B.16 Expressions

  constant_expression: $ => choice(
    $.constant_primary,
    seq($.unary_operator, $.constant_primary),
    prec.left(seq($.constant_expression, $.binary_operator, $.constant_expression)),
    prec.left(seq($.constant_expression, '?', $.constant_expression, ':', $.constant_expression))
  ),

  constant_primary: $ => choice(
    $.primary_literal,
    $.constant_concatenation,
    $.constant_multiple_concatenation,
    seq('(', $.constant_expression, ')'),
    $.constant_cast,
    $.instance_or_prop_ref,
    $.struct_literal,
    $.array_literal
  ),

  primary_literal: $ => choice(
    $.number,
    $.string_literal,
    $.boolean_literal,
    $.accesstype_literal,
    $.onreadtype_literal,
    $.onwritetype_literal,
    $.addressingtype_literal,
    $.enumerator_literal,
    'this'
  ),

  binary_operator: $ => choice(
    '&&', '||', '<', '>', '<=', '>=', '==', '!=', '>>', '<<',
    '&', '|', '^', '~^', '^~', '*', '/', '%', '+', '-', '**'
  ),

  unary_operator: $ => choice(
    '!', '+', '-', '~', '&', '~&', '|', '~|', '^', '~^', '^~'
  ),

  constant_cast: $ => seq($.casting_type, '\'', '(', $.constant_expression, ')'),

  casting_type: $ => choice(
    $.simple_type,
    $.constant_primary,
    'boolean'
  ),

  // B.17 Identifiers

  id: $ => /[a-zA-Z_]\w*/,

  // 4.2 Comments

  comment: $ => token(choice(
    seq('//', /.*/),
    seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )
  ))

};

module.exports = grammar({
  name: 'systemrdl',
  word: $ => $.id,
  rules: rules,
  extras: $ => [/\s/, $.comment]
});

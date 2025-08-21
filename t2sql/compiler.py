from __future__ import annotations
from typing import Dict, Any, List, Tuple
from t2sql.ast_schema import ALLOWED_OPS, ALLOWED_TABLES

def _guard_table_ref(ref: str):
    base = ref.split()[0]
    if base not in ALLOWED_TABLES: raise ValueError(f"table_not_allowed:{base}")

def _guard_col_ref(ref: str):
    if "." not in ref: raise ValueError("column_must_be_qualified")

def _emit_where(wheres: List[Dict[str,Any]], params: Dict[str,Any]) -> Tuple[str,List[Any]]:
    sql_parts, values = [], []
    for cond in wheres:
        op = cond["op"].upper()
        if op not in ALLOWED_OPS: raise ValueError("op_not_allowed")
        left = cond["left"]; _guard_col_ref(left)
        right = cond["right"]
        if isinstance(right, dict) and "param" in right:
            sql_parts.append(f"{left} {op} %s"); values.append(params[right["param"]])
        elif isinstance(right, dict) and "value" in right:
            sql_parts.append(f"{left} {op} %s"); values.append(right["value"])
        elif op == "IN" and isinstance(right, list):
            placeholders = ",".join(["%s"]*len(right))
            sql_parts.append(f"{left} IN ({placeholders})"); values.extend(right)
        else:
            raise ValueError("right_side_not_supported")
    return (" AND ".join(sql_parts) if sql_parts else "TRUE"), values

def compile_ast_to_sql(ast: Dict[str,Any]) -> Tuple[str,List[Any]]:
    sel = ast.get("select", []); frm = ast["from"]
    joins = ast.get("joins", []); wheres = ast.get("where", [])
    group_by = ast.get("group_by", []); order_by = ast.get("order_by", [])
    limit = int(ast.get("limit", 100)); params = ast.get("params", {})

    for col in sel: _guard_col_ref(col)
    _guard_table_ref(frm.split(" ")[0])
    for j in joins:
        _guard_table_ref(j["table"].split(" ")[0])
        if " = " not in j["on"]: raise ValueError("join_on_must_be_equality")

    where_sql, values = _emit_where(wheres, params)

    sql = f"SELECT {', '.join(sel)} FROM {frm}"
    for j in joins:
        jtype = j.get("type","inner").upper()
        if jtype not in ("INNER","LEFT","RIGHT","FULL","LEFT OUTER","RIGHT OUTER"):
            raise ValueError("join_type_not_allowed")
        sql += f" {jtype} JOIN {j['table']} ON {j['on']}"
    if where_sql: sql += f" WHERE {where_sql}"
    if group_by: sql += " GROUP BY " + ", ".join(group_by)
    if order_by: sql += " ORDER BY " + ", ".join(order_by)
    if limit: sql += f" LIMIT {limit}"
    return sql, values